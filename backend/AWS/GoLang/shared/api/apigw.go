package api

import (
	"blockchain-realestate/backend/aws/golang/shared/config"

	"github.com/aws/aws-lambda-go/events"
)

func Response(status int, body string) events.APIGatewayV2HTTPResponse {
	cfg := config.Load()
	origin := cfg.CorsOrigin
	if origin == "" {
		origin = "*"
	}

	return events.APIGatewayV2HTTPResponse{
		StatusCode: status,
		Headers: map[string]string{
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin":      origin,
			"Access-Control-Allow-Headers":     "Content-Type, Authorization",
			"Access-Control-Allow-Methods":     "GET,POST,PUT,DELETE,OPTIONS",
			"Access-Control-Allow-Credentials": "true",
		},
		Body:            body,
		IsBase64Encoded: false,
	}
}
