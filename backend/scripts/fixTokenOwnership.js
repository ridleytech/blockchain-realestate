require("dotenv").config();
const ethers = require("ethers");
const mongoose = require("mongoose");
const Property = require("../models/Property");

// ABI for the FractionalToken contract
const fractionalTokenABI = [
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner) public",
  "function enableTrading() public",
];

// Connect to the blockchain
const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_URL || "http://localhost:7545"
);

// Use the correct owner private key for 0x85a013d3A43f1E4429C30d0a631d844b847B0A75
const ownerPrivateKey =
  process.env.OWNER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
const wallet = new ethers.Wallet(ownerPrivateKey, provider);

// Override the expected owner to match the token contracts' owner
const EXPECTED_OWNER = "0x85a013d3A43f1E4429C30d0a631d844b847B0A75";

// Make sure we're using the correct wallet
if (wallet.address.toLowerCase() !== EXPECTED_OWNER.toLowerCase()) {
  console.error("❌ Wrong wallet address! Using:", wallet.address);
  console.error("   Expected:", EXPECTED_OWNER);
  console.error("   Please check your .env file for OWNER_PRIVATE_KEY");
  process.exit(1);
}

// Gas settings
const gasOptions = {
  gasLimit: 500000, // Higher gas limit
  gasPrice: ethers.utils.parseUnits("20", "gwei"),
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

async function fixTokenOwnership() {
  try {
    console.log("Using admin address:", wallet.address);

    // Get all properties from the database
    const properties = await Property.find({
      fractionalToken: { $exists: true, $ne: null },
    });

    console.log(`\nFound ${properties.length} properties with token addresses`);

    for (const property of properties) {
      const tokenAddress = property.fractionalToken;
      if (!ethers.utils.isAddress(tokenAddress)) {
        console.log(
          `\n⚠️  Invalid token address for property ${property._id}: ${tokenAddress}`
        );
        continue;
      }

      console.log(`\nProcessing property: ${property.title} (${property._id})`);
      console.log(`Token: ${tokenAddress}`);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        fractionalTokenABI,
        wallet
      );

      try {
        // Check current owner
        const currentOwner = await tokenContract.owner();
        console.log(`Current owner: ${currentOwner}`);
        console.log(`Expected owner: ${EXPECTED_OWNER}`);

        if (currentOwner.toLowerCase() === EXPECTED_OWNER.toLowerCase()) {
          console.log("✅ Owner is correct");
          console.log("   Now attempting to enable trading...");

          // Try to enable trading
          try {
            console.log("Enabling trading...");
            const tx = await tokenContract.enableTrading({
              ...gasOptions,
              nonce: await provider.getTransactionCount(
                wallet.address,
                "latest"
              ),
            });
            await tx.wait();
            console.log("✅ Trading enabled successfully:", tx.hash);
          } catch (error) {
            console.error(
              "❌ Error enabling trading:",
              error.reason || error.message
            );
          }
        } else {
          console.log(
            "⚠️  Owner does not match! Attempting to transfer ownership..."
          );
          try {
            // First transfer ownership
            const tx = await tokenContract.transferOwnership(wallet.address, {
              ...gasOptions,
              nonce: await provider.getTransactionCount(
                wallet.address,
                "latest"
              ),
            });
            await tx.wait();
            console.log("✅ Ownership transferred successfully:", tx.hash);

            // Now enable trading
            const enableTx = await tokenContract.enableTrading({
              ...gasOptions,
              nonce:
                (await provider.getTransactionCount(wallet.address, "latest")) +
                1,
            });
            await enableTx.wait();
            console.log(
              "✅ Trading enabled after ownership transfer:",
              enableTx.hash
            );
          } catch (error) {
            console.error(
              "❌ Error transferring ownership:",
              error.reason || error.message
            );
          }
        }
      } catch (error) {
        console.error(
          "❌ Error interacting with token contract:",
          error.reason || error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Script error:", error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

fixTokenOwnership();
