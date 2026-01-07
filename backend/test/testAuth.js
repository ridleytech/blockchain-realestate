const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Test user data
const testUser = {
  name: "Test User",
  email: "test@example.com",
  password: "Password123!",
  role: "admin",
  walletAddress: "0x1234567890123456789012345678901234567890",
};

// Test JWT authentication
const testJwtAuth = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Clean up any existing test user
    await User.deleteOne({ email: testUser.email });

    // Create a test user
    const user = await User.create(testUser);
    console.log("✅ Test user created:", user.email);

    // Generate JWT token
    const token = user.getSignedJwtToken();
    console.log("\n🔑 Generated JWT Token:");
    console.log(token);

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("\n🔍 Decoded Token:");
    console.log(decoded);

    // Test protected route
    console.log("\n🔒 Testing protected route...");
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Status: ${code}`);
          console.log("Response:", data);
          return { json: () => data };
        },
      }),
    };

    const next = (error) => {
      if (error) {
        console.error("❌ Error in protected route:", error.message);
      } else {
        console.log("✅ Successfully accessed protected route");
      }
    };

    // Test the auth middleware
    const { protect } = require("../middleware/auth");
    await protect(mockReq, mockRes, next);

    // Clean up
    await User.deleteOne({ email: testUser.email });
    console.log("\n🧹 Cleaned up test user");

    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  }
};

// Run the test
testJwtAuth();
