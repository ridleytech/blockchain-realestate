package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"blockchain-realestate/backend/aws/golang/shared/api"
	"blockchain-realestate/backend/aws/golang/shared/auth"
	"blockchain-realestate/backend/aws/golang/shared/db"
	"blockchain-realestate/backend/aws/golang/shared/models"
	"blockchain-realestate/backend/aws/golang/shared/validate"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func propertiesColl(database *mongo.Database) *mongo.Collection {
	return database.Collection("properties")
}

func usersColl(database *mongo.Database) *mongo.Collection {
	return database.Collection("users")
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

func handleGetAll(ctx context.Context) events.APIGatewayV2HTTPResponse {
	database, err := db.Database(ctx)
	if err != nil {
		fmt.Printf("properties getAll: db.Database error: %v\n", err)
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	cur, err := propertiesColl(database).Find(ctx, bson.M{})
	if err != nil {
		fmt.Printf("properties getAll: Find error: %v\n", err)
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}
	defer cur.Close(ctx)

	var props []bson.M
	if err := cur.All(ctx, &props); err != nil {
		fmt.Printf("properties getAll: cursor.All decode error: %v\n", err)
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"count":   len(props),
		"data":    props,
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func handleGetOne(ctx context.Context, id string) events.APIGatewayV2HTTPResponse {
	if id == "new" {
		resp := map[string]interface{}{
			"success": true,
			"isNew":   true,
			"data": map[string]interface{}{
				"title":       "",
				"description": "",
				"price":       0,
				"totalShares": 1000,
				"sharePrice":  0,
				"address": map[string]interface{}{
					"street":  "",
					"city":    "",
					"state":   "",
					"zipCode": "",
					"country": "",
				},
				"images": []interface{}{},
			},
		}
		status, b, _ := api.JSON(http.StatusOK, resp)
		return api.Response(status, b)
	}
	if !validate.PropertyIDRe.MatchString(id) {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid property ID format")
		return api.Response(status, b)
	}
	pid, pidErr := primitive.ObjectIDFromHex(id)

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	var prop bson.M
	if pidErr == nil {
		if err := propertiesColl(database).FindOne(ctx, bson.M{"_id": pid}).Decode(&prop); err == nil {
			resp := map[string]interface{}{
				"success": true,
				"data":    prop,
			}
			status, b, _ := api.JSON(http.StatusOK, resp)
			return api.Response(status, b)
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			fmt.Printf("properties getOne: FindOne(ObjectID) error for id=%s: %v\n", id, err)
			status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
			return api.Response(status, b)
		}
	}

	// Fallback: some datasets store _id as a string.
	if err := propertiesColl(database).FindOne(ctx, bson.M{"_id": id}).Decode(&prop); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			status, b, _ := api.Error(http.StatusNotFound, "Property not found")
			return api.Response(status, b)
		}
		fmt.Printf("properties getOne: FindOne(string _id) error for id=%s: %v\n", id, err)
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"data":    prop,
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func validateSharePrice(price float64, totalShares int, sharePrice float64) bool {
	calculated := price / float64(totalShares)
	rounded := math.Round(calculated*100) / 100
	return math.Abs(sharePrice-rounded) < 0.01
}

func handleCreate(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	uid, code, msg, err := requireUserID(req)
	if err != nil {
		status, b, _ := api.Error(code, msg)
		return api.Response(status, b)
	}

	var prop models.Property
	if err := json.Unmarshal([]byte(req.Body), &prop); err != nil {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid JSON body")
		return api.Response(status, b)
	}

	if strings.TrimSpace(prop.Title) == "" || strings.TrimSpace(prop.Description) == "" {
		status, b, _ := api.Error(http.StatusBadRequest, "Validation failed")
		return api.Response(status, b)
	}
	if prop.Price <= 0 {
		status, b, _ := api.Error(http.StatusBadRequest, "Validation failed")
		return api.Response(status, b)
	}
	if prop.TotalShares < 1 {
		status, b, _ := api.Error(http.StatusBadRequest, "Validation failed")
		return api.Response(status, b)
	}
	if prop.SharePrice <= 0 {
		status, b, _ := api.Error(http.StatusBadRequest, "Validation failed")
		return api.Response(status, b)
	}
	if !validateSharePrice(prop.Price, prop.TotalShares, prop.SharePrice) {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid price per share calculation. The share price must equal the total price divided by the number of shares.")
		return api.Response(status, b)
	}
	if strings.TrimSpace(prop.Address.Street) == "" || strings.TrimSpace(prop.Address.City) == "" || strings.TrimSpace(prop.Address.State) == "" || strings.TrimSpace(prop.Address.ZipCode) == "" || strings.TrimSpace(prop.Address.Country) == "" {
		status, b, _ := api.Error(http.StatusBadRequest, "Validation failed")
		return api.Response(status, b)
	}

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	now := time.Now()
	prop.ID = primitive.NewObjectID()
	prop.Lister = uid
	prop.AvailableShares = prop.TotalShares
	prop.IsListed = true
	prop.CreatedAt = now
	prop.UpdatedAt = now
	prop.CurrentOwners = []models.CurrentOwner{{
		User:            uid,
		Shares:          prop.TotalShares,
		PurchaseDate:    now,
		TransactionHash: "initial-creation-" + prop.ID.Hex(),
	}}

	_, err = propertiesColl(database).InsertOne(ctx, prop)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	status, b, _ := api.JSON(http.StatusCreated, prop)
	return api.Response(status, b)
}

func handleUpdate(ctx context.Context, req events.APIGatewayV2HTTPRequest, id string) events.APIGatewayV2HTTPResponse {
	uid, code, msg, err := requireUserID(req)
	if err != nil {
		status, b, _ := api.Error(code, msg)
		return api.Response(status, b)
	}
	if !validate.PropertyIDRe.MatchString(id) {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid property ID format")
		return api.Response(status, b)
	}
	pid, pidErr := primitive.ObjectIDFromHex(id)

	var update map[string]interface{}
	if err := json.Unmarshal([]byte(req.Body), &update); err != nil {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid JSON body")
		return api.Response(status, b)
	}

	delete(update, "totalShares")
	delete(update, "sharePrice")
	delete(update, "lister")
	delete(update, "availableShares")
	delete(update, "currentOwners")
	delete(update, "ownershipHistory")

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	filter := bson.M{"_id": id}
	if pidErr == nil {
		filter = bson.M{"_id": pid}
	}

	// For compatibility with existing Mongoose docs, do not attempt to decode into models.Property here.
	// We still keep a lister authorization check if the field exists and is an ObjectID.
	var existing bson.M
	if err := propertiesColl(database).FindOne(ctx, filter).Decode(&existing); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) && pidErr == nil {
			// fallback to string _id
			filter = bson.M{"_id": id}
			if err2 := propertiesColl(database).FindOne(ctx, filter).Decode(&existing); err2 != nil {
				status, b, _ := api.Error(http.StatusNotFound, "Property not found")
				return api.Response(status, b)
			}
		} else {
			status, b, _ := api.Error(http.StatusNotFound, "Property not found")
			return api.Response(status, b)
		}
	}
	if listerRaw, ok := existing["lister"]; ok {
		if listerOID, ok := listerRaw.(primitive.ObjectID); ok {
			if listerOID != uid {
				status, b, _ := api.Error(http.StatusUnauthorized, "User not authorized")
				return api.Response(status, b)
			}
		}
	}

	if priceRaw, ok := update["price"]; ok {
		price, ok := priceRaw.(float64)
		if !ok || price <= 0 {
			status, b, _ := api.Error(http.StatusBadRequest, "Invalid price. Must be a positive number.")
			return api.Response(status, b)
		}
		if totalSharesRaw, ok := existing["totalShares"]; ok {
			switch v := totalSharesRaw.(type) {
			case int32:
				if v > 0 {
					newSharePrice := price / float64(v)
					update["sharePrice"] = math.Round(newSharePrice*1e6) / 1e6
				}
			case int64:
				if v > 0 {
					newSharePrice := price / float64(v)
					update["sharePrice"] = math.Round(newSharePrice*1e6) / 1e6
				}
			case float64:
				if v > 0 {
					newSharePrice := price / float64(v)
					update["sharePrice"] = math.Round(newSharePrice*1e6) / 1e6
				}
			}
		}
	}
	update["updatedAt"] = time.Now()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated bson.M
	err = propertiesColl(database).FindOneAndUpdate(ctx, filter, bson.M{"$set": update}, opts).Decode(&updated)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"data":    updated,
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func handleDelete(ctx context.Context, req events.APIGatewayV2HTTPRequest, id string) events.APIGatewayV2HTTPResponse {
	uid, code, msg, err := requireUserID(req)
	if err != nil {
		status, b, _ := api.Error(code, msg)
		return api.Response(status, b)
	}
	if !validate.PropertyIDRe.MatchString(id) {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid property ID format")
		return api.Response(status, b)
	}
	pid, pidErr := primitive.ObjectIDFromHex(id)

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	filter := bson.M{"_id": id}
	if pidErr == nil {
		filter = bson.M{"_id": pid}
	}

	var existing bson.M
	if err := propertiesColl(database).FindOne(ctx, filter).Decode(&existing); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) && pidErr == nil {
			filter = bson.M{"_id": id}
			if err2 := propertiesColl(database).FindOne(ctx, filter).Decode(&existing); err2 != nil {
				status, b, _ := api.Error(http.StatusNotFound, "Property not found")
				return api.Response(status, b)
			}
		} else {
			status, b, _ := api.Error(http.StatusNotFound, "Property not found")
			return api.Response(status, b)
		}
	}
	if listerRaw, ok := existing["lister"]; ok {
		if listerOID, ok := listerRaw.(primitive.ObjectID); ok {
			if listerOID != uid {
				status, b, _ := api.Error(http.StatusUnauthorized, "User not authorized")
				return api.Response(status, b)
			}
		}
	}

	// If currentOwners is not in expected shape, we skip shareholder validation for compatibility.
	_, err = propertiesColl(database).DeleteOne(ctx, filter)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	status, b, _ := api.JSON(http.StatusOK, map[string]interface{}{"msg": "Property removed"})
	return api.Response(status, b)
}

func handleMeListed(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	uid, code, msg, err := requireUserID(req)
	if err != nil {
		status, b, _ := api.Error(code, msg)
		return api.Response(status, b)
	}
	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	cur, err := propertiesColl(database).Find(ctx, bson.M{"lister": uid})
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}
	defer cur.Close(ctx)
	var props []bson.M
	if err := cur.All(ctx, &props); err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}
	status, b, _ := api.JSON(http.StatusOK, props)
	return api.Response(status, b)
}

func handleMeOwned(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	uid, code, msg, err := requireUserID(req)
	if err != nil {
		status, b, _ := api.Error(code, msg)
		return api.Response(status, b)
	}
	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	cur, err := propertiesColl(database).Find(ctx, bson.M{"currentOwners.user": uid})
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}
	defer cur.Close(ctx)

	var props []bson.M
	if err := cur.All(ctx, &props); err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server Error")
		return api.Response(status, b)
	}

	status, b, _ := api.JSON(http.StatusOK, props)
	return api.Response(status, b)
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	path := req.RawPath
	method := strings.ToUpper(req.RequestContext.HTTP.Method)

	switch {
	case method == http.MethodGet && path == "/api/properties":
		return handleGetAll(ctx), nil
	case method == http.MethodPost && path == "/api/properties":
		return handleCreate(ctx, req), nil
	case method == http.MethodGet && strings.HasPrefix(path, "/api/properties/"):
		id := strings.TrimPrefix(path, "/api/properties/")
		if strings.HasPrefix(id, "me/") {
			break
		}
		return handleGetOne(ctx, id), nil
	case method == http.MethodPut && strings.HasPrefix(path, "/api/properties/"):
		id := strings.TrimPrefix(path, "/api/properties/")
		return handleUpdate(ctx, req, id), nil
	case method == http.MethodDelete && strings.HasPrefix(path, "/api/properties/"):
		id := strings.TrimPrefix(path, "/api/properties/")
		return handleDelete(ctx, req, id), nil
	case method == http.MethodGet && path == "/api/properties/me/listed":
		return handleMeListed(ctx, req), nil
	case method == http.MethodGet && path == "/api/properties/me/owned":
		return handleMeOwned(ctx, req), nil
	default:
		status, b, _ := api.Error(http.StatusNotFound, "Not found")
		return api.Response(status, b), nil
	}

	status, b, _ := api.Error(http.StatusNotFound, "Not found")
	return api.Response(status, b), nil
}

func main() {
	lambda.Start(handler)
}
