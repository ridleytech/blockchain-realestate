const { Web3 } = require("web3");
const mongoose = require("mongoose");
const Property = require("../models/Property");

// Load environment variables
require("dotenv").config({ path: ".env" });

// Contract ABIs
const factoryABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "propertyNFT", type: "address" },
      { indexed: true, name: "propertyTokenId", type: "uint256" },
      { indexed: true, name: "fractionalToken", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "totalShares", type: "uint256" },
      { indexed: false, name: "pricePerShare", type: "uint256" },
    ],
    name: "FractionalTokenCreated",
    type: "event",
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
  {
    inputs: [],
    name: "propertyTokenId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pricePerShare",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "propertyNFT",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "propertyOwner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
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

    if (!process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS) {
      throw new Error("FRACTIONAL_TOKEN_FACTORY_ADDRESS is not set in .env");
    }

    // Get the factory contract
    const factory = new web3.eth.Contract(
      factoryABI,
      process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS
    );

    // Get all properties from the database
    const properties = await Property.find({});
    console.log(`\nFound ${properties.length} properties`);

    // Get all FractionalTokenCreated events
    console.log("Fetching token creation events...");
    const events = await factory.getPastEvents("FractionalTokenCreated", {
      fromBlock: 0,
      toBlock: "latest",
    });

    console.log(`Found ${events.length} token creation events`);

    // Create a map of propertyTokenId to token info
    const tokenMap = {};
    events.forEach((event) => {
      const {
        propertyTokenId,
        fractionalToken,
        name,
        symbol,
        totalShares,
        pricePerShare,
      } = event.returnValues;

      tokenMap[propertyTokenId] = {
        address: fractionalToken,
        name,
        symbol,
        totalShares: web3.utils.fromWei(totalShares, "ether"),
        pricePerShare: web3.utils.fromWei(pricePerShare, "ether"),
      };
    });

    for (const property of properties) {
      if (!property.tokenId) {
        console.log(
          `\nProperty "${property.title}" (${property._id}): No token ID`
        );
        continue;
      }

      console.log(`\nProperty: ${property.title} (ID: ${property.tokenId})`);

      try {
        const tokenInfo = tokenMap[property.tokenId];

        if (!tokenInfo) {
          console.log("  ❌ No token found for this property");
          continue;
        }

        console.log(`  Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
        console.log(`  Address: ${tokenInfo.address}`);
        console.log(`  Total Shares: ${tokenInfo.totalShares}`);
        console.log(`  Price Per Share: ${tokenInfo.pricePerShare} ETH`);

        // Check token contract
        const token = new web3.eth.Contract(tokenABI, tokenInfo.address);

        // Get token details
        const [isTradable, owner, tokenPropertyId] = await Promise.all([
          token.methods.isTradable().call(),
          token.methods.owner().call(),
          token.methods.propertyTokenId().call(),
        ]);

        console.log("  Owner:", owner);
        console.log("  Trading enabled:", isTradable);

        // Verify the token's property ID matches (convert both to string for comparison)
        const tokenPropIdStr = tokenPropertyId.toString();
        const propTokenIdStr = property.tokenId.toString();

        if (tokenPropIdStr !== propTokenIdStr) {
          console.warn(
            `  ⚠️ Token's property ID (${tokenPropertyId}) doesn't match property ID (${property.tokenId})`
          );
        } else {
          console.log(`  ✅ Token's property ID matches (${tokenPropertyId})`);
        }
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
