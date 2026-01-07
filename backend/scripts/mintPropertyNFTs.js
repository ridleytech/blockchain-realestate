const ethers = require("ethers");
const mongoose = require("mongoose");
require("dotenv").config();

// Import ABI and connect to database
const PropertyNFTABI = require("../../frontend/src/contracts/PropertyNFT.json");
const Property = require("../models/Property");

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/realestate",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

async function mintPropertyNFTs() {
  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545"
  );
  const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

  // Connect to PropertyNFT contract
  const propertyNFT = new ethers.Contract(
    process.env.PROPERTY_NFT_CONTRACT_ADDRESS,
    PropertyNFTABI.abi,
    wallet
  );

  try {
    // Get all properties from database that don't have a tokenId or have it set to null
    const properties = await Property.find({
      $or: [{ tokenId: { $exists: false } }, { tokenId: null }],
    });

    console.log(`Found ${properties.length} properties without token IDs`);

    if (properties.length === 0) {
      console.log("All properties already have token IDs");
      return;
    }

    console.log(`Found ${properties.length} properties to mint tokens for`);

    for (const property of properties) {
      try {
        console.log(`\nMinting token for property: ${property.title}`);

        // Mint the NFT
        const tx = await propertyNFT.mintProperty(
          wallet.address, // owner
          property.title,
          property.address || "No address provided",
          property.size || 0,
          `ipfs://property-${property._id}`
        );

        const receipt = await tx.wait();
        const event = receipt.events?.find((e) => e.event === "PropertyMinted");
        const tokenId = event?.args?.tokenId.toString();

        if (tokenId) {
          // Update property with token ID
          property.tokenId = tokenId;
          await property.save();
          console.log(
            `✅ Minted token ${tokenId} for property: ${property.title}`
          );
        } else {
          console.error("❌ Could not find token ID in transaction receipt");
        }
      } catch (error) {
        console.error(
          `❌ Error minting token for property ${property.title}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Error in mintPropertyNFTs:", error);
  } finally {
    mongoose.disconnect();
  }
}

mintPropertyNFTs().catch(console.error);
