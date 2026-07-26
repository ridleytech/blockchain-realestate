package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"blockchain-realestate/backend/aws/golang/shared/api"
	"blockchain-realestate/backend/aws/golang/shared/auth"
	"blockchain-realestate/backend/aws/golang/shared/db"
	"blockchain-realestate/backend/aws/golang/shared/validate"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type createPurchaseRequest struct {
	PropertyID       string `json:"propertyId"`
	Shares           int    `json:"shares"`
	TransactionHash  string `json:"transactionHash"`
	AmountWei        string `json:"amount"`
	AmountUsd        float64 `json:"amountUsd"`
}

func transactionsColl(database *mongo.Database) *mongo.Collection {
	return database.Collection("transactions")
}

func propertiesColl(database *mongo.Database) *mongo.Collection {
	return database.Collection("properties")
}

func requireUserID(req events.APIGatewayV2HTTPRequest) (primitive.ObjectID, int, string, error) {
	tok, err := auth.BearerToken(req)
	if err != nil {
		return primitive.NilObjectID, http.StatusUnauthorized, "Not authorized to access this route - No token provided", err
	}
	claims, err := auth.ParseToken(tok)
	if err != nil {
		return primitive.NilObjectID, http.StatusUnauthorized, "Invalid token", err
	}
	uid, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return primitive.NilObjectID, http.StatusUnauthorized, "Invalid token format", err
	}
	return uid, 0, "", nil
}

func handleGetByProperty(ctx context.Context, propertyID string) events.APIGatewayV2HTTPResponse {
	if !validate.PropertyIDRe.MatchString(propertyID) {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid property ID format")
		return api.Response(status, b)
	}
	pid, pidErr := primitive.ObjectIDFromHex(propertyID)

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	filter := bson.M{"property": propertyID}
	if pidErr == nil {
		filter = bson.M{"property": pid}
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cur, err := transactionsColl(database).Find(ctx, filter, opts)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}
	defer cur.Close(ctx)

	var txs []bson.M
	if err := cur.All(ctx, &txs); err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	// Transform minimally to match UI expectations for buyer/seller populated objects.
	out := make([]map[string]interface{}, 0, len(txs))
	for _, t := range txs {
		m := map[string]interface{}{}
		for k, v := range t {
			m[k] = v
		}

		if buyerRaw, ok := t["buyer"]; ok {
			if oid, ok := buyerRaw.(primitive.ObjectID); ok {
				m["buyer"] = map[string]interface{}{"_id": oid.Hex()}
			}
		}
		if sellerRaw, ok := t["seller"]; ok {
			if oid, ok := sellerRaw.(primitive.ObjectID); ok {
				m["seller"] = map[string]interface{}{"_id": oid.Hex()}
			}
		}
		if propRaw, ok := t["property"]; ok {
			if oid, ok := propRaw.(primitive.ObjectID); ok {
				m["property"] = oid.Hex()
			}
		}

		out = append(out, m)
	}

	resp := map[string]interface{}{
		"success": true,
		"count":   len(out),
		"data":    out,
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func handleCreate(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	uid, code, msg, err := requireUserID(req)
	if err != nil {
		status, b, _ := api.Error(code, msg)
		return api.Response(status, b)
	}

	var body createPurchaseRequest
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid JSON body")
		return api.Response(status, b)
	}

	body.PropertyID = strings.TrimSpace(body.PropertyID)
	body.TransactionHash = strings.TrimSpace(body.TransactionHash)
	if body.PropertyID == "" || body.TransactionHash == "" || body.Shares < 1 {
		status, b, _ := api.Error(http.StatusBadRequest, "Validation failed")
		return api.Response(status, b)
	}
	if !validate.PropertyIDRe.MatchString(body.PropertyID) {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid property ID format")
		return api.Response(status, b)
	}

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	pid, pidErr := primitive.ObjectIDFromHex(body.PropertyID)
	if pidErr != nil {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid property ID format")
		return api.Response(status, b)
	}

	// Determine seller from property.lister if available.
	seller := primitive.NilObjectID
	var prop bson.M
	if err := propertiesColl(database).FindOne(ctx, bson.M{"_id": pid}).Decode(&prop); err == nil {
		if listerRaw, ok := prop["lister"]; ok {
			if oid, ok := listerRaw.(primitive.ObjectID); ok {
				seller = oid
			}
		}
	}
	if seller == primitive.NilObjectID {
		seller = uid
	}

	now := time.Now()
	doc := bson.M{
		"property":         pid,
		"buyer":            uid,
		"seller":           seller,
		"shares":           body.Shares,
		"amount":           body.AmountWei,
		"amountUsd":        body.AmountUsd,
		"transactionHash":  body.TransactionHash,
		"status":           "completed",
		"createdAt":        now,
		"updatedAt":        now,
	}

	_, err = transactionsColl(database).InsertOne(ctx, doc)
	if err != nil {
		// Duplicate hash should be a 400.
		var we mongo.WriteException
		if errors.As(err, &we) {
			for _, e := range we.WriteErrors {
				if e.Code == 11000 {
					status, b, _ := api.Error(http.StatusBadRequest, "Duplicate transaction")
					return api.Response(status, b)
				}
			}
		}
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"data":    doc,
	}
	status, b, _ := api.JSON(http.StatusCreated, resp)
	return api.Response(status, b)
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	path := req.RawPath
	method := strings.ToUpper(req.RequestContext.HTTP.Method)

	switch {
	case method == http.MethodGet && strings.HasPrefix(path, "/api/purchase/property/"):
		id := strings.TrimPrefix(path, "/api/purchase/property/")
		return handleGetByProperty(ctx, id), nil
	case method == http.MethodPost && (path == "/api/purchase" || path == "/api/purchase/"):
		return handleCreate(ctx, req), nil
	default:
		status, b, _ := api.Error(http.StatusNotFound, "Not found")
		return api.Response(status, b), nil
	}
}

func main() {
	lambda.Start(handler)
}
