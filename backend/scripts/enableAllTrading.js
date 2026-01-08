const Web3 = require("web3");
const mongoose = require("mongoose");
const Property = require("../models/Property");

// Load environment variables
require("dotenv").config({ path: ".env" });

// Contract ABIs
const factoryABI = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "getTokenByPropertyId",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "enableTradingOnToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const tokenABI = [
  {
    inputs: [],
    name: "isTradable",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

async function enableAllTrading() {
  try {
    // Connect to the blockchain
    const web3 = new Web3(
      process.env.BLOCKCHAIN_URL || "http://127.0.0.1:7545"
    );

    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Get the factory contract
    const factory = new web3.eth.Contract(
      factoryABI,
      process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS
    );

    // Get the admin account
    const accounts = await web3.eth.getAccounts();
    const adminAccount = accounts[0];
    console.log("Using admin account:", adminAccount);

    // Get all properties from the database
    const properties = await Property.find({});
    console.log(`Found ${properties.length} properties`);

    for (const property of properties) {
      if (!property.tokenId) {
        console.log(`\nSkipping property "${property.title}" - no token ID`);
        continue;
      }

      console.log(
        `\nProcessing property: ${property.title} (Token ID: ${property.tokenId})`
      );

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

        // Check if trading is already enabled
        const isTradable = await token.methods.isTradable().call();
        if (isTradable) {
          console.log("  ✅ Trading is already enabled");
          continue;
        }

        // Get token owner
        const tokenOwner = await token.methods.owner().call();
        console.log("  Token owner:", tokenOwner);

        // Check if the factory is the owner
        const factoryAddress =
          process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS.toLowerCase();
        if (tokenOwner.toLowerCase() !== factoryAddress) {
          console.log("  ⚠️  Warning: Token is not owned by the factory!");
        }

        // Enable trading through the factory
        console.log("  Enabling trading...");
        const tx = await factory.methods
          .enableTradingOnToken(tokenAddress)
          .send({
            from: adminAccount,
            gas: 500000,
            gasPrice: web3.utils.toWei("20", "gwei"),
          });

        console.log("  ✅ Trading enabled successfully!");
        console.log("  Transaction hash:", tx.transactionHash);
      } catch (error) {
        console.error("  ❌ Error:", error.message);
        if (error.receipt) {
          console.log("  Transaction receipt:", error.receipt);
        }
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
enableAllTrading();
