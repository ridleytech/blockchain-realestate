const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");

// Load environment variables from .env file in the project root
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

const listUsers = async () => {
  try {
    await connectDB();

    // Find all users
    const users = await User.find({}).select("-password");

    if (users.length === 0) {
      console.log("No users found in the database.");
      return;
    }

    console.log("\n=== Users in Database ===");
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log("ID:", user._id);
      console.log("Name:", user.name);
      console.log("Email:", user.email);
      console.log("Wallet Address:", user.walletAddress);
      console.log("Role:", user.role);
      console.log("isActive:", user.isActive);
      console.log("isEmailVerified:", user.isEmailVerified);
      console.log("Created At:", user.createdAt);
      console.log("-------------------");
    });
  } catch (err) {
    console.error("Error listing users:", err);
  } finally {
    // Close the connection
    mongoose.connection.close();
  }
};

listUsers();
