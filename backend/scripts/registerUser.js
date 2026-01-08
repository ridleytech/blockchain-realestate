const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/blockchain-real-estate"
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};

const registerUser = async (userData) => {
  try {
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.error("User already exists with this email");
      return;
    }

    // Create new user
    const user = new User({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      walletAddress: userData.walletAddress,
      role: "user",
      isActive: true,
      isEmailVerified: true,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    // Save user to database
    await user.save();

    console.log("User registered successfully:", {
      id: user._id,
      name: user.name,
      email: user.email,
      walletAddress: user.walletAddress,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (err) {
    console.error("Error registering user:", err);
  } finally {
    // Close the connection
    mongoose.connection.close();
  }
};

// Get user data from command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    "Usage: node scripts/registerUser.js <name> <email> <password> [walletAddress]"
  );
  process.exit(1);
}

const userData = {
  name: args[0],
  email: args[1],
  password: args[2],
  walletAddress: args[3] || "0x0000000000000000000000000000000000000000", // Default wallet address if not provided
};

registerUser(userData);
