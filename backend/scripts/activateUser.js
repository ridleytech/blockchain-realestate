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
        "mongodb://localhost:27017/blockchain-real-estate",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};

const activateUser = async (email) => {
  try {
    await connectDB();

    // Find the user by email and update isActive to true
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          isActive: true,
          isEmailVerified: true,
        },
      },
      { new: true }
    );

    if (!user) {
      console.error("User not found with email:", email);
      return;
    }

    console.log("User activated successfully:", {
      id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (err) {
    console.error("Error activating user:", err);
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

activateUser(email);
