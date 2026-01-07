const mongoose = require("mongoose");
const ethers = require("ethers");
const Property = require("../models/Property");
require("dotenv").config();

// Load contract ABIs
const FractionalTokenFactoryABI = require("../../frontend/src/contracts/FractionalTokenFactory.json");

// Configuration
const PROVIDER_URL =
  process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545";
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const PROPERTY_NFT_CONTRACT_ADDRESS = process.env.PROPERTY_NFT_CONTRACT_ADDRESS;
const FACTORY_ADDRESS = process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS;

// Validate environment variables
if (!PRIVATE_KEY) throw new Error("ADMIN_PRIVATE_KEY is not set in .env");
if (!PROPERTY_NFT_CONTRACT_ADDRESS)
  throw new Error("PROPERTY_NFT_CONTRACT_ADDRESS is not set in .env");
if (!FACTORY_ADDRESS)
  throw new Error("FRACTIONAL_TOKEN_FACTORY_ADDRESS is not set in .env");

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

// Helper function to convert title to a valid symbol
function createSymbol(title) {
  // Take first 3 letters, remove non-alphanumeric, and make uppercase
  let symbol = title
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 3)
    .toUpperCase();

  // Ensure we have at least 2 characters
  if (symbol.length < 2) {
    symbol = symbol.padEnd(2, "X");
  }

  return symbol;
}

// Deploy tokens for properties
const deployTokensForProperties = async () => {
  try {
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Get all properties that don't have a fractional token address
    const properties = await Property.find({
      $or: [
        { fractionalToken: { $exists: false } },
        { fractionalToken: null },
        { fractionalToken: "0x0000000000000000000000000000000000000000" },
      ],
    });

    if (properties.length === 0) {
      console.log("All properties already have fractional tokens");
      return;
    }

    console.log(`Found ${properties.length} properties to deploy tokens for`);

    // Create contract instances
    const factory = new ethers.Contract(
      FACTORY_ADDRESS,
      FractionalTokenFactoryABI.abi,
      wallet
    );

    // Deploy tokens for each property
    for (const property of properties) {
      try {
        console.log(`\nDeploying token for property: ${property.title}`);

        if (!property.tokenId) {
          console.error(`❌ Property ${property.title} is missing tokenId`);
          continue;
        }

        // Get the token ID from the property
        const tokenId = property.tokenId;

        // Create a short name and symbol
        const name = `${property.title.substring(0, 20)} Shares`;
        const symbol = `${createSymbol(property.title)}${tokenId}`.substring(
          0,
          8
        );

        // Calculate total shares and price per share based on property price
        const totalShares = 1000; // Fixed number of shares per property
        const pricePerShare = property.price
          ? ethers.utils.parseEther((property.price / totalShares).toFixed(18))
          : ethers.utils.parseEther("0.01"); // Default to 0.01 ETH per share

        console.log(`  Token ID: ${tokenId}`);
        console.log(`  Name: ${name}`);
        console.log(`  Symbol: ${symbol}`);
        console.log(`  Total Shares: ${totalShares}`);
        console.log(
          `  Price per Share: ${ethers.utils.formatEther(pricePerShare)} ETH`
        );

        // Create the fractional token
        console.log("  Sending transaction...");
        const tx = await factory.createFractionalToken(
          PROPERTY_NFT_CONTRACT_ADDRESS, // propertyNFTAddress
          tokenId, // propertyTokenId
          name, // name
          symbol, // symbol
          totalShares, // totalShares
          pricePerShare, // pricePerShare
          {
            gasLimit: 5000000, // Increase gas limit
            gasPrice: ethers.utils.parseUnits("10", "gwei"), // Set explicit gas price
          }
        );

        console.log("  Waiting for transaction confirmation...");
        const receipt = await tx.wait();

        console.log("  Transaction hash:", receipt.transactionHash);
        console.log(
          "  Transaction status:",
          receipt.status === 1 ? "Success" : "Failed"
        );

        if (receipt.status !== 1) {
          throw new Error("Transaction failed");
        }

        console.log("  Logs length:", receipt.logs?.length || 0);

        // Log all events for debugging
        if (receipt.events?.length > 0) {
          console.log(
            "  Events found:",
            receipt.events.map((e) => e.event || "unknown").join(", ")
          );
        } else {
          console.log("  No events found in receipt");
        }

        // Try to find the FractionalTokenCreated event
        let tokenAddress;
        const event = receipt.events?.find(
          (e) => e.event === "FractionalTokenCreated"
        );

        if (event) {
          console.log("  Found FractionalTokenCreated event");
          // The token address is in event.args.fractionalToken
          tokenAddress = event.args.fractionalToken;
          console.log("  Token address from event:", tokenAddress);

          // Log all args for debugging
          console.log("  All event args:", {
            propertyNFT: event.args.propertyNFT,
            propertyTokenId: event.args.propertyTokenId.toString(),
            fractionalToken: event.args.fractionalToken,
            name: event.args.name,
            symbol: event.args.symbol,
            totalShares: event.args.totalShares.toString(),
            pricePerShare: event.args.pricePerShare.toString(),
          });
        } else {
          console.log(
            "  No FractionalTokenCreated event found, trying to parse logs..."
          );

          // Try to parse logs manually
          const iface = new ethers.utils.Interface(
            FractionalTokenFactoryABI.abi
          );

          for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
            console.log(`  Log ${i}:`, {
              address: log.address,
              topics: log.topics,
              data: log.data,
            });

            try {
              const parsedLog = iface.parseLog(log);
              console.log(`  Parsed log ${i}:`, parsedLog);

              if (parsedLog && parsedLog.name === "FractionalTokenCreated") {
                tokenAddress = parsedLog.args.tokenAddress;
                console.log("  Found token address in logs:", tokenAddress);
                break;
              }
            } catch (e) {
              console.log(`  Could not parse log ${i}:`, e.message);
            }
          }

          if (!tokenAddress) {
            console.error("  Could not find token address in any logs");
            throw new Error(
              "Could not find token address in transaction receipt"
            );
          }
        }

        // Update the property with the token address
        property.fractionalToken = tokenAddress;
        await property.save();

        console.log(
          `✅ Deployed token ${tokenAddress} for property: ${property.title}`
        );
      } catch (error) {
        console.error(
          `❌ Error deploying token for ${property.title}:`,
          error.message
        );
        if (error.reason) console.error("  Reason:", error.reason);
        if (error.data) console.error("  Data:", error.data);
      }
    }
  } catch (error) {
    console.error("Error in deployTokensForProperties:", error);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.data) console.error("Data:", error.data);
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
