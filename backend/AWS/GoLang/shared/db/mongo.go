package db

import (
	"context"
	"errors"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	clientOnce sync.Once
	client     *mongo.Client
	clientErr  error
)

func getDBNameFromURI(uri string) string {
	if v := os.Getenv("MONGODB_DB"); v != "" {
		return v
	}
	if u, err := url.Parse(uri); err == nil {
		p := strings.TrimPrefix(u.Path, "/")
		if p != "" {
			return p
		}
	}
	return "blockchain-real-estate"
}

func Client(ctx context.Context) (*mongo.Client, error) {
	clientOnce.Do(func() {
		uri := os.Getenv("MONGODB_URI")
		if strings.TrimSpace(uri) == "" {
			clientErr = errors.New("MONGODB_URI is not set")
			return
		}

		opts := options.Client().ApplyURI(uri)
		tCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()

		c, err := mongo.Connect(tCtx, opts)
		if err != nil {
			clientErr = err
			return
		}
		client = c
	})
	return client, clientErr
}

func Database(ctx context.Context) (*mongo.Database, error) {
	c, err := Client(ctx)
	if err != nil {
		return nil, err
	}
	uri := os.Getenv("MONGODB_URI")
	name := getDBNameFromURI(uri)
	return c.Database(name), nil
}
