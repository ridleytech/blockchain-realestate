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

// Enable CORS
// Enable CORS for all routes
app.use(
  cors({
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Send JSON error response for API
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : {},
  });
});

// Error handling middleware (this is a duplicate, keeping the more detailed one below)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : {},
  });
});

// Server startup is handled in bin/www
module.exports = app;
