const Web3 = require("web3");
const mongoose = require("mongoose");
const path = require("path");

// Load environment variables from project root
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Import the Property model from the backend directory
const Property = require(path.resolve(__dirname, "../backend/models/Property"));
const factoryArtifact = require("../../build/contracts/FractionalTokenFactory.json");
const tokenArtifact = require("../../build/contracts/FractionalToken.json");

async function enableTrading() {
  try {
    // Connect to the blockchain
    const web3 = new Web3(
      process.env.BLOCKCHAIN_URL || "http://127.0.0.1:7545"
    );

    // Connect to MongoDB with retry logic
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    console.log("Connecting to MongoDB...");

    // MongoDB connection options
    const mongoOptions = {
      // No specific options needed for this MongoDB driver version
      // The driver will use sensible defaults
    };

    // Attempt to connect with retry
    const maxRetries = 3;
    let retryCount = 0;
    let connected = false;

    while (retryCount < maxRetries && !connected) {
      try {
        await mongoose.connect(process.env.MONGO_URI, mongoOptions);
        connected = true;
        console.log("✅ Successfully connected to MongoDB");
      } catch (error) {
        retryCount++;
        console.error(
          `❌ MongoDB connection attempt ${retryCount} failed:`,
          error.message
        );
        if (retryCount < maxRetries) {
          console.log(
            `Retrying in 3 seconds... (${
              maxRetries - retryCount
            } attempts remaining)`
          );
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } else {
          throw new Error(
            `Failed to connect to MongoDB after ${maxRetries} attempts: ${error.message}`
          );
        }
      }
    }

    // Get the factory contract
    const factory = new web3.eth.Contract(
      factoryArtifact.abi,
      process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS
    );

    // Get the admin account (first account in Ganache)
    const accounts = await web3.eth.getAccounts();
    const adminAccount = accounts[0];
    console.log("Using admin account:", adminAccount);

    // Get all properties from the database
    const properties = await Property.find({});
    console.log(`\nFound ${properties.length} properties`);

    for (const [index, property] of properties.entries()) {
      if (!property.tokenId) {
        console.log(
          `\n[${index + 1}/${properties.length}] Skipping property ${
            property._id
          } - no tokenId`
        );
        continue;
      }

      console.log(
        `\n[${index + 1}/${properties.length}] Processing property: ${
          property.title
        } (${property._id})`
      );
      console.log("  Token ID:", property.tokenId);

      try {
        // Get the token address from the factory
        console.log("  Fetching token address from factory...");
        const tokenAddress = await factory.methods
          .getTokenByPropertyId(property.tokenId)
          .call();

        if (
          !tokenAddress ||
          tokenAddress === "0x0000000000000000000000000000000000000000"
        ) {
          console.log("  ❌ No token address found for property");
          continue;
        }

        console.log("  Token address:", tokenAddress);

        // Check token contract
        const token = new web3.eth.Contract(tokenArtifact.abi, tokenAddress);

        // Check if trading is already enabled
        const isTradable = await token.methods.isTradable().call();
        if (isTradable) {
          console.log("  ✅ Trading is already enabled for this token");
          continue;
        }

        // Get token owner
        const tokenOwner = await token.methods.owner().call();
        console.log("  Token owner:", tokenOwner);

        // Check if the factory is the owner
        const factoryAddress = (
          await factory.methods.owner().call()
        ).toLowerCase();
        if (tokenOwner.toLowerCase() !== factoryAddress) {
          console.log("  ⚠️  Warning: Token is not owned by the factory!");
        }

        // Enable trading through the factory
        console.log("  Enabling trading via factory...");
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
enableTrading();
