package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"blockchain-realestate/backend/aws/golang/shared/api"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type askRequest struct {
	Question string `json:"question"`
	Prompt   string `json:"prompt"`
	Message  string `json:"message"`
	PropertyID string `json:"propertyId"`
}

func handleAsk(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
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
	if q == "" {
		status, b, _ := api.Error(http.StatusBadRequest, "Question is required")
		return api.Response(status, b)
	}

	resp := map[string]interface{}{
		"success": true,
		"answer":  "AI endpoint is wired up in Go SAM, but provider integration is not implemented yet.",
		"data": map[string]interface{}{
			"answer":    "AI endpoint is wired up in Go SAM, but provider integration is not implemented yet.",
			"question":  q,
			"propertyId": strings.TrimSpace(body.PropertyID),
			"debug": map[string]interface{}{
				"rawPath": req.RawPath,
				"method":  strings.ToUpper(req.RequestContext.HTTP.Method),
				"headers": req.Headers,
			},
		},
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
