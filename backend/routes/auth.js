const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { check, validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty().trim().escape(),
    check("email", "Please include a valid email").isEmail().normalizeEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
    check(
      "walletAddress",
      "Ethereum wallet address is required and must start with 0x"
    )
      .notEmpty()
      .matches(/^0x[a-fA-F0-9]{40}$/),
  ],
  async (req, res, next) => {
    // Log the incoming request body for debugging
    console.log(
      "Registration attempt with data:",
      JSON.stringify(req.body, null, 2)
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("Validation errors:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { name, email, password, walletAddress } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ success: false, message: "User already exists" });
      }

      // Create user
      user = new User({
        name,
        email,
        password,
        walletAddress,
      });

      // The password will be hashed by the pre-save hook in the User model
      await user.save();

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "30d" },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      next(new ErrorResponse("Server error", 500));
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res, next) => {
    console.log("Login attempt with:", { email: req.body.email });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      console.log("Looking for user with email:", email);
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        console.log("No user found with email:", email);
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }

      // Check password
      console.log("User found, checking password...");
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        console.log("Password does not match for user:", email);
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: process.env.JWT_EXPIRE || "30d" },
        (err, token) => {
          if (err) {
            console.error("JWT Error:", err);
            return res
              .status(500)
              .json({ success: false, message: "Error generating token" });
          }
          res.json({
            success: true,
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              walletAddress: user.walletAddress,
              role: user.role || "user",
            },
          });
        }
      );
    } catch (err) {
      console.error("Login error:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error during login" });
    }
  }
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", auth.protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Error in /me endpoint:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
