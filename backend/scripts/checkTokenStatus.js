const Web3 = require("web3");
const mongoose = require("mongoose");
const Property = require("../models/Property");

// Load environment variables
require("dotenv").config({ path: ".env" });

// Contract ABIs
const factoryABI = [
  "function getTokenByPropertyId(uint256) view returns (address)",
  "function isTradingEnabled(address) view returns (bool)",
];

const tokenABI = [
  "function isTradable() view returns (bool)",
  "function owner() view returns (address)",
];

async function checkTokenStatus() {
  try {
    // Connect to the blockchain
    const web3 = new Web3(
      process.env.BLOCKCHAIN_URL || "http://127.0.0.1:7545"
    );

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get the factory contract
    const factory = new web3.eth.Contract(
      factoryABI,
      process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS
    );

    // Get all properties from the database
    const properties = await Property.find({});
    console.log(`Found ${properties.length} properties`);

    for (const property of properties) {
      if (!property.tokenId) {
        console.log(
          `\nProperty "${property.title}" (${property._id}): No token ID`
        );
        continue;
      }

      console.log(`\nProperty: ${property.title} (ID: ${property.tokenId})`);

      try {
        // Get the token address from the factory
        const tokenAddress = await factory.methods
          .getTokenByPropertyId(property.tokenId)
          .call();

        if (
          !tokenAddress ||
          tokenAddress === "0x0000000000000000000000000000000000000000"
        ) {
          console.log("  ❌ No token address found");
          continue;
        }

        console.log("  Token address:", tokenAddress);

        // Check token contract
        const token = new web3.eth.Contract(tokenABI, tokenAddress);

        // Check if trading is enabled
        const isTradable = await token.methods.isTradable().call();
        const owner = await token.methods.owner().call();

        console.log("  Owner:", owner);
        console.log("  Trading enabled:", isTradable);
      } catch (error) {
        console.error("  ❌ Error checking token:", error.message);
      }
    }
  } catch (error) {
    console.error("Script error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the script
checkTokenStatus();
