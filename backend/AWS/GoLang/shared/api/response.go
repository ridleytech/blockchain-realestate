package api

import (
	"encoding/json"
)

type ErrorBody struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type SuccessBody struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
}

func JSON(status int, v interface{}) (int, string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return 500, "{\"success\":false,\"message\":\"failed to encode response\"}", nil
	}
	return status, string(b), nil
}

func Error(status int, message string) (int, string, error) {
	return JSON(status, ErrorBody{Success: false, Message: message})
}
