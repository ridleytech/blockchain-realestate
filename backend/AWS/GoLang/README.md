# Go Backend (AWS SAM) - Local Testing

This folder contains the Go + AWS SAM version of the backend.

## Prereqs

- Go installed (`go version`)
- AWS SAM CLI installed (`sam --version`)
- Local MongoDB running (because default `MONGODB_URI` points to localhost)

## Build

From the repo root:

```bash
sam build -t backend/AWS/GoLang/template.yaml
```

Or from this folder:

```bash
sam build
```

## Run locally

From the repo root:

```bash
sam local start-api -t backend/AWS/GoLang/template.yaml --port 4001
```

This will serve endpoints on:

- `http://127.0.0.1:4001`

## Environment / configuration

SAM uses template parameters (see `template.yaml`). Defaults are:

- `MongoDbUri`: `mongodb://localhost:27017/blockchain-real-estate`
- `JwtSecret`: `dev-secret`
- `JwtExpire`: `30d`

You can override params when running locally:

```bash
sam local start-api -t backend/AWS/GoLang/template.yaml --port 4001 \
  --parameter-overrides \
  "MongoDbUri=mongodb://localhost:27017/blockchain-real-estate JwtSecret=dev-secret JwtExpire=30d"
```

## Smoke tests

### Register

```bash
curl -s -X POST http://127.0.0.1:4001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"ridleytechnologies@gmail.com","password":"check1224","walletAddress":"0x0000000000000000000000000000000000000001"}'
```

curl -s -X POST http://127.0.0.1:4001/api/auth/login \  
 -H 'Content-Type: application/json' \
 -d '{"email":"ridleycustomjewelry@gmail.com","password":"check1224"}'

curl -s -X POST http://127.0.0.1:4001/api/auth/login \  
 -H 'Content-Type: application/json' \
 -d '{"email":"ridleycustomjewelry@gmail.com","password":"check1224"}'

### Login

```bash
curl -s -X POST http://127.0.0.1:4001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'
```

Copy the `token` from the response.

### /me

```bash
TOKEN=<paste_token_here>
curl -s http://127.0.0.1:4001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### List properties

```bash
curl -s http://127.0.0.1:4001/api/properties
```

## Point the React frontend at Go

In your React env file (commonly `.env.local` at the repo root):

```bash
REACT_APP_BACKEND=go
```

Or explicitly:

```bash
REACT_APP_API_URL=http://127.0.0.1:4001
```

Restart the React dev server after changing env vars.

## Notes

- If you run `sam build` from `backend/aws/golang` (lowercase path), you may hit Go module path issues. Prefer using `backend/AWS/GoLang` or always pass `-t backend/AWS/GoLang/template.yaml`.

export ATLAS_PASS='check1224'
sam local start-api -t .aws-sam/build/template.yaml --port 4001 \
 --parameter-overrides "MongoDbUri=mongodb+srv://ridley1224:${ATLAS_PASS}@rt.hfqlgqh.mongodb.net/blockchain-real-estate?retryWrites=true&w=majority NodeEnv=development CorsOrigin=http://localhost:3000 JwtSecret=dev-secret JwtExpire=30d"

sam build -t backend/AWS/GoLang/template.yaml

ATLAS_PASS='check1224' sam local start-api -t .aws-sam/build/template.yaml --port 4001 \
 --parameter-overrides "MongoDbUri=mongodb+srv://ridley1224:${ATLAS_PASS}@rt.hfqlgqh.mongodb.net/blockchain-real-estate?retryWrites=true&w=majority NodeEnv=development CorsOrigin=http://localhost:3000 JwtSecret=dev-secret JwtExpire=30d"

sam build -t backend/AWS/GoLang/template.yaml
sam local start-api -t .aws-sam/build/template.yaml --port 4001 \
 --parameter-overrides "MongoDbUri=mongodb+srv://ridley1224:check1224@rt.hfqlgqh.mongodb.net/blockchain-real-estate?retryWrites=true&w=majority NodeEnv=development CorsOrigin=http://localhost:3000 JwtSecret=dev-secret JwtExpire=30d"
