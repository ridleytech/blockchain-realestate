package auth

import (
	"errors"
	"strings"

	"github.com/aws/aws-lambda-go/events"
)

func BearerToken(req events.APIGatewayV2HTTPRequest) (string, error) {
	h := ""
	for k, v := range req.Headers {
		if strings.EqualFold(k, "authorization") {
			h = v
			break
		}
	}
	if strings.TrimSpace(h) == "" {
		return "", errors.New("no authorization header")
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return "", errors.New("invalid authorization header")
	}
	if strings.TrimSpace(parts[1]) == "" {
		return "", errors.New("empty bearer token")
	}
	return parts[1], nil
}
