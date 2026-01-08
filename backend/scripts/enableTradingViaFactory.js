require("dotenv").config();
const ethers = require("ethers");
const mongoose = require("mongoose");

// ABI for the FractionalTokenFactory
const factoryABI = [
  "function getTokenByPropertyId(uint256) view returns (address)",
  "function enableTradingOnToken(address) public",
];

// Connect to the blockchain
const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_URL || "http://localhost:7545"
);
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

// Factory address
const FACTORY_ADDRESS = "0x85a013d3A43f1E4429C30d0a631d844b847B0A75";

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

async function enableTradingOnAllTokens() {
  try {
    console.log("Using admin address:", wallet.address);

    // Connect to the factory
    const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);

    // Get all properties from the database
    const Property = require("../models/Property");
    const properties = await Property.find({});

    console.log(`\nFound ${properties.length} properties`);

    for (const property of properties) {
      if (!property.tokenId) {
        console.log(`\nSkipping property ${property._id} - no tokenId`);
        continue;
      }

      console.log(`\nProcessing property: ${property.title} (${property._id})`);

      try {
        // Get the token address from the factory
        const tokenAddress = await factory.getTokenByPropertyId(
          property.tokenId
        );

        if (
          !tokenAddress ||
          tokenAddress === "0x0000000000000000000000000000000000000000"
        ) {
          console.log("  No token address found for property");
          continue;
        }

        console.log("  Token address:", tokenAddress);

        // Enable trading through the factory
        console.log("  Enabling trading via factory...");
        const tx = await factory.enableTradingOnToken(tokenAddress, {
          gasLimit: 500000,
          gasPrice: ethers.utils.parseUnits("20", "gwei"),
        });

        console.log("  Transaction sent, waiting for confirmation...");
        await tx.wait();
        console.log("  ✅ Trading enabled successfully!");
        console.log("  Transaction hash:", tx.hash);
      } catch (error) {
        console.error("  ❌ Error:", error.reason || error.message);
      }
    }
  } catch (error) {
    console.error("❌ Script error:", error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

enableTradingOnAllTokens();
