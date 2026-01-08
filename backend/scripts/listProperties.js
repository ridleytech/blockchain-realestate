require("dotenv").config();
const mongoose = require("mongoose");

async function listProperties() {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/blockchain-real-estate";
    console.log(`Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);

    // Import Property model
    const Property = require("../models/Property");

    // Find all properties with required fields
    const properties = await Property.find(
      {},
      "title tokenId isListed availableShares sharePrice"
    ).lean();

    // Log each property with details
    console.log("Properties in database:");
    console.log("-".repeat(80));
    properties.forEach((prop, index) => {
      console.log(`[${index + 1}] ${prop.title}`);
      console.log(`   _id: ${prop._id}`);
      console.log(`   Token ID: ${prop.tokenId || "Not set"}`);
      console.log(`   isListed: ${prop.isListed ? "✅ Yes" : "❌ No"}`);
      console.log(`   Available Shares: ${prop.availableShares || 0}`);
      console.log(`   Share Price: $${prop.sharePrice || "Not set"}`);
      console.log("-".repeat(80));
    });

    console.log(`\nTotal properties: ${properties.length}`);
  } catch (error) {
    console.error("Error listing properties:", error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
  }
}

listProperties().catch(console.error);
