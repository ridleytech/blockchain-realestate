const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Get token from header or cookie
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(
      new ErrorResponse(
        "Not authorized to access this route - No token provided",
        401
      )
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is expired
    const now = Date.now().valueOf() / 1000;
    if (decoded.exp < now) {
      return next(
        new ErrorResponse("Your session has expired. Please log in again.", 401)
      );
    }

    // Handle both token formats: { id: user.id } and { user: { id: user.id } }
    const userId = decoded.id || (decoded.user && decoded.user.id);

    if (!userId) {
      return next(new ErrorResponse("Invalid token format", 401));
    }

    // Get user from the token and attach to request
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return next(new ErrorResponse("User not found with this id", 404));
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);

    let message = "Not authorized to access this route";

    if (err.name === "JsonWebTokenError") {
      message = "Invalid token";
    } else if (err.name === "TokenExpiredError") {
      message = "Your session has expired. Please log in again.";
    }

    return next(new ErrorResponse(message, 401));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse("User not authenticated", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
