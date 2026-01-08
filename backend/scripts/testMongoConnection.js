const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

async function testConnection() {
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log(
      "MONGODB_URI:",
      process.env.MONGODB_URI ? "Found" : "Not found"
    );

    // Set mongoose options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    };

    // Try to connect
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log("✅ Successfully connected to MongoDB!");

    // List all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("\nCollections in database:");
    collections.forEach((collection) => console.log(`- ${collection.name}`));
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testConnection();
