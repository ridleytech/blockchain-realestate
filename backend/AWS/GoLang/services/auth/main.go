package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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
	"golang.org/x/crypto/bcrypt"
)

type registerRequest struct {
	Name          string `json:"name"`
	Email         string `json:"email"`
	Password      string `json:"password"`
	WalletAddress string `json:"walletAddress"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func usersColl(database *mongo.Database) *mongo.Collection {
	return database.Collection("users")
}

func handleRegister(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	var body registerRequest
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid JSON body")
		return api.Response(status, b)
	}
	body.Name = strings.TrimSpace(body.Name)
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	body.WalletAddress = strings.TrimSpace(body.WalletAddress)

	if body.Name == "" {
		status, b, _ := api.Error(http.StatusBadRequest, "Name is required")
		return api.Response(status, b)
	}
	if !validate.EmailRe.MatchString(body.Email) {
		status, b, _ := api.Error(http.StatusBadRequest, "Please include a valid email")
		return api.Response(status, b)
	}
	if len(body.Password) < 6 {
		status, b, _ := api.Error(http.StatusBadRequest, "Please enter a password with 6 or more characters")
		return api.Response(status, b)
	}
	if !validate.EthAddressRe.MatchString(body.WalletAddress) {
		status, b, _ := api.Error(http.StatusBadRequest, "Ethereum wallet address is required and must start with 0x")
		return api.Response(status, b)
	}

	database, err := db.Database(ctx)
	if err != nil {
		fmt.Printf("auth register: db.Database error: %v\n", err)
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	coll := usersColl(database)

	count, err := coll.CountDocuments(ctx, bson.M{"email": body.Email})
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server error")
		return api.Response(status, b)
	}
	if count > 0 {
		status, b, _ := api.Error(http.StatusBadRequest, "User already exists")
		return api.Response(status, b)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server error")
		return api.Response(status, b)
	}

	now := time.Now()
	u := models.User{
		Name:          body.Name,
		Email:         body.Email,
		PasswordHash:  string(hash),
		WalletAddress: body.WalletAddress,
		Role:          "user",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	res, err := coll.InsertOne(ctx, u)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Server error")
		return api.Response(status, b)
	}
	id, _ := res.InsertedID.(primitive.ObjectID)
	token, err := auth.SignToken(id, u.Role)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Token generation error")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"token":   token,
		"user": map[string]interface{}{
			"id":    id.Hex(),
			"name":  u.Name,
			"email": u.Email,
		},
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func handleLogin(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	var body loginRequest
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid JSON body")
		return api.Response(status, b)
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	password := strings.TrimSpace(body.Password)

	if !validate.EmailRe.MatchString(body.Email) {
		status, b, _ := api.Error(http.StatusBadRequest, "Please include a valid email")
		return api.Response(status, b)
	}
	if password == "" {
		status, b, _ := api.Error(http.StatusBadRequest, "Password is required")
		return api.Response(status, b)
	}

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	coll := usersColl(database)
	var u models.User
	if err := coll.FindOne(ctx, bson.M{"email": body.Email}, options.FindOne()).Decode(&u); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			status, b, _ := api.Error(http.StatusUnauthorized, "Invalid credentials")
			return api.Response(status, b)
		}
		fmt.Printf("auth login: FindOne error for email=%s: %v\n", body.Email, err)
		status, b, _ := api.Error(http.StatusInternalServerError, "Server error")
		return api.Response(status, b)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		fmt.Printf("auth login: bcrypt mismatch for email=%s: %v\n", body.Email, err)
		status, b, _ := api.Error(http.StatusUnauthorized, "Invalid credentials")
		return api.Response(status, b)
	}

	token, err := auth.SignToken(u.ID, u.Role)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Error generating token")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"token":   token,
		"user": map[string]interface{}{
			"id":            u.ID.Hex(),
			"name":          u.Name,
			"email":         u.Email,
			"walletAddress": u.WalletAddress,
			"role":          u.Role,
		},
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func handleMe(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	tok, err := auth.BearerToken(req)
	if err != nil {
		status, b, _ := api.Error(http.StatusUnauthorized, "Not authorized to access this route - No token provided")
		return api.Response(status, b)
	}
	claims, err := auth.ParseToken(tok)
	if err != nil {
		status, b, _ := api.Error(http.StatusUnauthorized, "Invalid token")
		return api.Response(status, b)
	}

	uid, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		status, b, _ := api.Error(http.StatusUnauthorized, "Invalid token format")
		return api.Response(status, b)
	}

	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	coll := usersColl(database)
	var u models.User
	if err := coll.FindOne(ctx, bson.M{"_id": uid}).Decode(&u); err != nil {
		status, b, _ := api.Error(http.StatusNotFound, "User not found")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"data":    u.ToPublic(true),
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	path := req.RawPath
	method := strings.ToUpper(req.RequestContext.HTTP.Method)

	switch {
	case method == http.MethodPost && path == "/api/auth/register":
		return handleRegister(ctx, req), nil
	case method == http.MethodPost && path == "/api/auth/login":
		return handleLogin(ctx, req), nil
	case method == http.MethodGet && path == "/api/auth/me":
		return handleMe(ctx, req), nil
	default:
		status, b, _ := api.Error(http.StatusNotFound, "Not found")
		return api.Response(status, b), nil
	}
}

func main() {
	lambda.Start(handler)
}
