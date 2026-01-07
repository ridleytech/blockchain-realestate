const mongoose = require("mongoose");
const ethers = require("ethers");
const Property = require("../models/Property");
require("dotenv").config();

// Load contract ABIs
const FractionalTokenFactoryABI = require("../../frontend/src/contracts/FractionalTokenFactory.json");

// Configuration
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS; // Set this in your .env
const PROVIDER_URL =
  process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY; // Set this in your .env

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/blockchain-real-estate",
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// Deploy tokens for properties
const deployTokensForProperties = async () => {
  if (!FACTORY_ADDRESS || !PRIVATE_KEY) {
    console.error(
      "Please set FACTORY_ADDRESS and DEPLOYER_PRIVATE_KEY in .env"
    );
    process.exit(1);
  }

  try {
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Load factory contract
    const factory = new ethers.Contract(
      FACTORY_ADDRESS,
      FractionalTokenFactoryABI.abi,
      wallet
    );

    // Get all properties without a fractional token
    const properties = await Property.find({
      fractionalToken: { $in: [null, ""] },
    });

    if (properties.length === 0) {
      console.log("All properties already have tokens assigned");
      return;
    }

    console.log(`Found ${properties.length} properties without tokens`);

    // Deploy a token for each property
    for (const property of properties) {
      try {
        console.log(`Deploying token for property: ${property.title}`);

        // Deploy the token
        const tx = await factory.createFractionalToken(
          `${property.title} Shares`, // Name
          `${property.symbol || "PROP"}-${property._id.toString().slice(-4)}`, // Symbol
          property._id.toString(), // Property ID
          property.totalShares || 1000, // Total shares
          ethers.utils.parseEther((property.sharePrice || 0.1).toString()) // Price per share in wei
        );

        const receipt = await tx.wait();
        const event = receipt.events?.find(
          (e) => e.event === "FractionalTokenCreated"
        );

        if (!event) {
          throw new Error("Token deployment event not found");
        }

        const tokenAddress = event.args.token;

        // Update the property with the token address
        property.fractionalToken = tokenAddress;
        await property.save();

        console.log(`✅ Deployed token for ${property.title}: ${tokenAddress}`);
      } catch (error) {
        console.error(
          `❌ Error deploying token for ${property.title}:`,
          error.message
        );
      }
    }

    console.log("Token deployment completed");
  } catch (error) {
    console.error("Error in deployTokensForProperties:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
(async () => {
  await connectDB();
  await deployTokensForProperties();
})();
