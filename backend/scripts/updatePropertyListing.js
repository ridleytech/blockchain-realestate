const mongoose = require("mongoose");
require("dotenv").config();
const Property = require("../models/Property");

async function updatePropertyListing(propertyId, isListed) {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI ||
        "mongodb://localhost:27017/blockchain-real-estate",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("Connected to MongoDB");

    // Update the property
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { isListed },
      { new: true }
    );

    if (!updatedProperty) {
      console.error("Property not found");
      process.exit(1);
    }

    console.log("Property updated successfully:");
    console.log({
      id: updatedProperty._id,
      title: updatedProperty.title,
      isListed: updatedProperty.isListed,
      availableShares: updatedProperty.availableShares,
      lister: updatedProperty.lister,
    });

    process.exit(0);
  } catch (error) {
    console.error("Error updating property:", error);
    process.exit(1);
  }
}

// Get property ID and listing status from command line arguments
const propertyId = process.argv[2];
const shouldList = process.argv[3] === "true";

if (!propertyId) {
  console.error("Please provide a property ID");
  console.log("Usage: node updatePropertyListing.js <propertyId> <true/false>");
  process.exit(1);
}

console.log(`Setting property ${propertyId} listing status to: ${shouldList}`);
updatePropertyListing(propertyId, shouldList);
