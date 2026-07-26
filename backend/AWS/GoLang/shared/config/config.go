package config

import "os"

type Config struct {
	MongoURI   string
	JWTSecret  string
	JWTExpire  string
	Env        string
	CorsOrigin string
}

func Load() Config {
	return Config{
		MongoURI:   os.Getenv("MONGODB_URI"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
		JWTExpire:  os.Getenv("JWT_EXPIRE"),
		Env:        os.Getenv("NODE_ENV"),
		CorsOrigin: os.Getenv("CORS_ORIGIN"),
	}
}
