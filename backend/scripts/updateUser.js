const mongoose = require("mongoose");
const User = require("../models/User");
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

const updateUser = async (email) => {
  try {
    await connectDB();

    // Find and update the user
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          isActive: true,
          isEmailVerified: true,
          role: "user", // Ensure role is set
        },
        $setOnInsert: {
          // These fields will only be set if we're doing an upsert
          name: "ra",
          walletAddress: "0xed1ba060692529272b773495bbaee8f7836e3f66", // Updated to MetaMask wallet
        },
      },
      {
        new: true, // Return the updated document
        upsert: false, // Don't create if doesn't exist
      }
    );

    if (!user) {
      console.error("User not found");
      return;
    }

    console.log("User updated successfully:", {
      id: user._id,
      name: user.name,
      email: user.email,
      walletAddress: user.walletAddress,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (err) {
    console.error("Error updating user:", err);
  } finally {
    // Close the connection
    mongoose.connection.close();
  }
};

// Get email from command line arguments
const email = process.argv[2];
if (!email) {
  console.error("Please provide an email address");
  process.exit(1);
}

updateUser(email);
