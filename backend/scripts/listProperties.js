require("dotenv").config();
const mongoose = require("mongoose");

async function listProperties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/realestate"
    );

    // Import Property model
    const Property = require("../models/Property");

    // Find all properties with only title and tokenId fields
    const properties = await Property.find({}, "title tokenId").lean();

    // Log each property
    console.log("Properties in database:");
    properties.forEach((prop, index) => {
      console.log(
        `${index + 1}. Title: ${prop.title}, Token ID: ${
          prop.tokenId || "Not set"
        }`
      );
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
