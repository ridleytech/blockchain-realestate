package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"blockchain-realestate/backend/aws/golang/shared/api"
	"blockchain-realestate/backend/aws/golang/shared/auth"
	"blockchain-realestate/backend/aws/golang/shared/db"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type askRequest struct {
	Question string `json:"question"`
	Prompt   string `json:"prompt"`
	Message  string `json:"message"`
	PropertyID string `json:"propertyId"`
}

type retrievalCitation struct {
	Source string `json:"source"`
}

type propertyContext struct {
	ID              string              `json:"id,omitempty"`
	Title           string              `json:"title,omitempty"`
	Description     string              `json:"description,omitempty"`
	Address         interface{}         `json:"address,omitempty"`
	Price           interface{}         `json:"price,omitempty"`
	PriceCurrency   interface{}         `json:"priceCurrency,omitempty"`
	TotalShares     interface{}         `json:"totalShares,omitempty"`
	AvailableShares interface{}         `json:"availableShares,omitempty"`
	SharePrice      interface{}         `json:"sharePrice,omitempty"`
	PropertyType    interface{}         `json:"propertyType,omitempty"`
	Size            interface{}         `json:"size,omitempty"`
	Bedrooms        interface{}         `json:"bedrooms,omitempty"`
	Bathrooms       interface{}         `json:"bathrooms,omitempty"`
	YearBuilt       interface{}         `json:"yearBuilt,omitempty"`
	IsListed        interface{}         `json:"isListed,omitempty"`
	OwnersCount     int                 `json:"ownersCount"`
	ImagesCount     int                 `json:"imagesCount"`
	Features        []map[string]string `json:"features"`
}

func propertiesColl(database *mongo.Database) *mongo.Collection {
	return database.Collection("properties")
}

func requireUser(req events.APIGatewayV2HTTPRequest) (primitive.ObjectID, int, string, error) {
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

func getAWSRegion() string {
	if v := os.Getenv("AWS_REGION"); v != "" {
		return v
	}
	if v := os.Getenv("AWS_DEFAULT_REGION"); v != "" {
		return v
	}
	return "us-west-2"
}

func buildPropertyContext(prop bson.M) propertyContext {
	ctx := propertyContext{}
	if idRaw, ok := prop["_id"]; ok {
		switch v := idRaw.(type) {
		case primitive.ObjectID:
			ctx.ID = v.Hex()
		case string:
			ctx.ID = v
		}
	}
	if v, ok := prop["title"].(string); ok {
		ctx.Title = v
	}
	if v, ok := prop["description"].(string); ok {
		ctx.Description = v
	}
	ctx.Address = prop["address"]
	ctx.Price = prop["price"]
	ctx.PriceCurrency = prop["priceCurrency"]
	ctx.TotalShares = prop["totalShares"]
	ctx.AvailableShares = prop["availableShares"]
	ctx.SharePrice = prop["sharePrice"]
	ctx.PropertyType = prop["propertyType"]
	ctx.Size = prop["size"]
	ctx.Bedrooms = prop["bedrooms"]
	ctx.Bathrooms = prop["bathrooms"]
	ctx.YearBuilt = prop["yearBuilt"]
	ctx.IsListed = prop["isListed"]

	if ownersRaw, ok := prop["currentOwners"].(bson.A); ok {
		ctx.OwnersCount = len(ownersRaw)
	}
	if imgsRaw, ok := prop["images"].(bson.A); ok {
		ctx.ImagesCount = len(imgsRaw)
	}

	ctx.Features = []map[string]string{}
	if featsRaw, ok := prop["features"].(bson.A); ok {
		for _, f := range featsRaw {
			fm, ok := f.(bson.M)
			if !ok {
				continue
			}
			name, _ := fm["name"].(string)
			value, _ := fm["value"].(string)
			if name == "" && value == "" {
				continue
			}
			ctx.Features = append(ctx.Features, map[string]string{"name": name, "value": value})
		}
	}
	return ctx
}

func invokeClaude(ctx context.Context, awsCfg aws.Config, modelID string, body string, guardrailID string, guardrailVersion string) (string, error) {
	client := bedrockruntime.NewFromConfig(awsCfg)

	input := &bedrockruntime.InvokeModelInput{
		ModelId:     &modelID,
		ContentType: aws.String("application/json"),
		Accept:      aws.String("application/json"),
		Body:        []byte(body),
	}
	if guardrailID != "" && guardrailVersion != "" {
		input.GuardrailIdentifier = aws.String(guardrailID)
		input.GuardrailVersion = aws.String(guardrailVersion)
	}

	resp, err := client.InvokeModel(ctx, input)
	if err != nil {
		return "", err
	}

	var out map[string]interface{}
	if err := json.Unmarshal(resp.Body, &out); err != nil {
		return "", err
	}
	contentRaw, ok := out["content"]
	if !ok {
		return "", nil
	}
	arr, ok := contentRaw.([]interface{})
	if !ok {
		return "", nil
	}
	parts := make([]string, 0, len(arr))
	for _, c := range arr {
		m, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		if t, _ := m["type"].(string); t != "text" {
			continue
		}
		if txt, _ := m["text"].(string); strings.TrimSpace(txt) != "" {
			parts = append(parts, txt)
		}
	}
	return strings.TrimSpace(strings.Join(parts, "\n")), nil
}

func isRetryableModelIDError(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	if strings.Contains(s, "provided model identifier is invalid") {
		return true
	}
	if strings.Contains(s, "validationexception") && strings.Contains(s, "model") && strings.Contains(s, "invalid") {
		return true
	}
	if strings.Contains(s, "resourcenotfoundexception") && strings.Contains(s, "model") {
		return true
	}
	if strings.Contains(s, "end of its life") {
		return true
	}
	return false
}

func handleAsk(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	_, code, msg, err := requireUser(req)
	if err != nil {
		status, b, _ := api.Error(code, msg)
		return api.Response(status, b)
	}

	var body askRequest
	if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
		status, b, _ := api.Error(http.StatusBadRequest, "Invalid JSON body")
		return api.Response(status, b)
	}

	q := strings.TrimSpace(body.Question)
	if q == "" {
		q = strings.TrimSpace(body.Prompt)
	}
	if q == "" {
		q = strings.TrimSpace(body.Message)
	}
	propertyID := strings.TrimSpace(body.PropertyID)
	if propertyID == "" || q == "" {
		status, b, _ := api.Error(http.StatusBadRequest, "propertyId and question are required")
		return api.Response(status, b)
	}
	if len(q) == 0 || len(q) > 500 {
		status, b, _ := api.Error(http.StatusBadRequest, "Question must be between 1 and 500 characters")
		return api.Response(status, b)
	}

	debugEnabled := os.Getenv("NODE_ENV") == "development" && req.QueryStringParameters["debug"] == "1"

	// Load property
	database, err := db.Database(ctx)
	if err != nil {
		status, b, _ := api.Error(http.StatusInternalServerError, "Database connection error")
		return api.Response(status, b)
	}

	pid, pidErr := primitive.ObjectIDFromHex(propertyID)
	filter := bson.M{"_id": propertyID}
	if pidErr == nil {
		filter = bson.M{"_id": pid}
	}

	var prop bson.M
	if err := propertiesColl(database).FindOne(ctx, filter).Decode(&prop); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			status, b, _ := api.Error(http.StatusNotFound, "Property not found")
			return api.Response(status, b)
		}
		fmt.Printf("ai ask: property FindOne error: %v\n", err)
		status, b, _ := api.Error(http.StatusInternalServerError, "AI service error")
		return api.Response(status, b)
	}

	ctxObj := buildPropertyContext(prop)
	if len(ctxObj.Description) > 1200 {
		ctxObj.Description = ctxObj.Description[:1200] + "..."
	}

	awsCfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(getAWSRegion()))
	if err != nil {
		fmt.Printf("ai ask: aws config error: %v\n", err)
		status, b, _ := api.Error(http.StatusInternalServerError, "AI service error")
		return api.Response(status, b)
	}

	modelID := os.Getenv("BEDROCK_MODEL_ID")
	if modelID == "" {
		modelID = "anthropic.claude-3-5-sonnet-20241022-v1:0"
	}

	// Knowledge Base retrieval is not implemented yet in Go.
	// If you have KNOWLEDGE_BASE_ID configured, the Node backend will use it for RAG.
	// We'll add parity after Bedrock Runtime is stable.
	citations := []retrievalCitation{}
	var retrievalDebug map[string]interface{}
	kbContext := ""

	ctxJSON, _ := json.MarshalIndent(ctxObj, "", "  ")
	userContent := fmt.Sprintf("Property context (JSON):\n%s%s\n\nUser question: %s", string(ctxJSON), kbContext, q)

	systemPrompt := strings.Join([]string{
		"You are an assistant for a blockchain real estate investment platform.",
		"Answer clearly and concisely using the provided property facts.",
		"Do not provide financial advice or guarantees. If data is missing, state the limitation.",
		"Keep answers investor-friendly and factual.",
	}, " ")

	bedrockBody := map[string]interface{}{
		"anthropic_version": "bedrock-2023-05-31",
		"system":            systemPrompt,
		"messages": []map[string]interface{}{
			{
				"role": "user",
				"content": []map[string]string{{"type": "text", "text": userContent}},
			},
		},
		"max_tokens":  800,
		"temperature": 0.2,
	}
	bedrockBodyJSON, _ := json.Marshal(bedrockBody)

	guardrailID := strings.TrimSpace(os.Getenv("BEDROCK_GUARDRAIL_ID"))
	guardrailVersion := strings.TrimSpace(os.Getenv("BEDROCK_GUARDRAIL_VERSION"))

	invokeCtx, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()

	answer, err := invokeClaude(invokeCtx, awsCfg, modelID, string(bedrockBodyJSON), guardrailID, guardrailVersion)
	if err != nil {
		fmt.Printf("ai ask: InvokeModel error: %v\n", err)
		status, b, _ := api.Error(http.StatusInternalServerError, "AI service error")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success":   true,
		"answer":    answer,
		"citations": citations,
	}
	if debugEnabled && retrievalDebug != nil {
		resp["debug"] = map[string]interface{}{"retrieval": retrievalDebug}
	}
	status, b, _ := api.JSON(http.StatusOK, resp)
	return api.Response(status, b)
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	path := req.RawPath
	method := strings.ToUpper(req.RequestContext.HTTP.Method)

	switch {
	case method == http.MethodPost && path == "/api/ai/ask":
		return handleAsk(ctx, req), nil
	default:
		status, b, _ := api.Error(http.StatusNotFound, "Not found")
		return api.Response(status, b), nil
	}
}

func main() {
	lambda.Start(handler)
}
