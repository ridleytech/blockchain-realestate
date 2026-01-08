// Load environment variables first
require("dotenv").config();

// Import models to ensure they're registered before use
require("./models");

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const propertyRoutes = require("./routes/propertyRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");

var app = express();

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/blockchain-realestate"
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Enable CORS with credentials
const allowedOrigins = [
  "http://localhost:3000", // Your frontend URL
  "http://localhost:4000", // Optional: Allow backend-to-backend if needed
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // This allows the session cookie to be sent back and forth
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
};

// Apply CORS with the above options
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Explicitly serve images from the images directory with proper caching
const staticOptions = {
  setHeaders: (res, path) => {
    // Set proper cache headers for all static files
    res.setHeader("Cache-Control", "public, max-age=31536000");
  },
};

// Serve images from the public/images directory
app.use(
  "/images",
  express.static(path.join(__dirname, "public/images"), staticOptions)
);

// For backward compatibility, also serve images from root
app.use(express.static(path.join(__dirname, "public/images"), staticOptions));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/properties", propertyRoutes);
app.use("/api/purchase", purchaseRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  // Set static folder
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/build", "index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Set status code from error or default to 500
  const statusCode = err.statusCode || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.error = err.stack;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
});

// Server startup is handled in bin/www
module.exports = app;
