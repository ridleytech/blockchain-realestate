const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// Database connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/blockchain-real-estate";

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    return resetProperties();
  })
  .then(() => {
    console.log("✅ Successfully reset all properties");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

async function resetProperties() {
  try {
    // Import the models
    const Property = require("../models/Property");
    const Transaction = require("../models/Transaction");

    // Reset all properties
    const propertyReset = await Property.updateMany({}, [
      {
        $set: {
          availableShares: "$totalShares",
          contractAddress: null,
          tokenId: null,
          currentOwners: [],
          ownershipHistory: [],
        },
      },
    ]);
    console.log(`✅ Reset ${propertyReset.modifiedCount} properties`);

    // Clear all transactions
    const transactionDelete = await Transaction.deleteMany({});
    console.log(`✅ Deleted ${transactionDelete.deletedCount} transactions`);

    return { propertyReset, transactionDelete };
  } catch (error) {
    console.error("❌ Error resetting properties:", error);
    throw error;
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
