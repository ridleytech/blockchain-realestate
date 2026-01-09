require("dotenv").config();
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const path = require("path");
const projectRoot = path.join(__dirname, "../..");
const FractionalToken = require(path.join(
  projectRoot,
  "build/contracts/FractionalToken.json"
));
const PropertyNFT = require(path.join(
  projectRoot,
  "build/contracts/PropertyNFT.json"
));
const Property = require("../models/Property");
const User = require("../models/User");

// Initialize ethers provider
const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_NODE_URL || "http://127.0.0.1:7545"
);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Get token balance for an account
const getTokenBalance = async (tokenContract, account) => {
  try {
    const balance = await tokenContract.balanceOf(account);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error(`Error getting token balance for ${account}:`, error.message);
    return "Error";
  }
};

// Get ETH balance for an account
const getEthBalance = async (account) => {
  try {
    const balance = await provider.getBalance(account);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error(`Error getting ETH balance for ${account}:`, error.message);
    return "Error";
  }
};

// Get token details
const getTokenDetails = async (tokenContract) => {
  try {
    const [name, symbol, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.totalSupply(),
    ]);
    return {
      name,
      symbol,
      totalSupply: ethers.utils.formatEther(totalSupply),
    };
  } catch (error) {
    console.error("Error getting token details:", error.message);
    return null;
  }
};

// Main function
const main = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get accounts
    const accounts = await provider.listAccounts();
    console.log("Available accounts:", accounts);

    // Get all properties with tokens
    const properties = await Property.find({
      fractionalToken: { $exists: true, $ne: null },
    });

    if (properties.length === 0) {
      console.log("No properties with tokens found in the database.");
      return;
    }

    console.log(`\nFound ${properties.length} properties with tokens.`);

    for (const property of properties) {
      console.log(`\nProperty: ${property.title} (${property._id})`);
      console.log("----------------------------------------");

      if (!property.fractionalToken) {
        console.log("No token address found for this property.");
        continue;
      }

      // Initialize token contract
      const tokenContract = new ethers.Contract(
        property.fractionalToken,
        FractionalToken.abi,
        provider
      );

      // Get token details
      const tokenDetails = await getTokenDetails(tokenContract);
      if (tokenDetails) {
        console.log(`Token: ${tokenDetails.name} (${tokenDetails.symbol})`);
        console.log(
          `Total Supply: ${tokenDetails.totalSupply} ${tokenDetails.symbol}`
        );
      }

      // Check balances for all accounts
      console.log("\nAccount Balances:");
      console.log("-----------------");

      for (const account of accounts) {
        const [tokenBalance, ethBalance] = await Promise.all([
          getTokenBalance(tokenContract, account),
          getEthBalance(account),
        ]);
        console.log(
          `${account}:
          ETH: ${parseFloat(ethBalance).toFixed(4)} ETH
          ${tokenDetails?.symbol || "Tokens"}: ${tokenBalance} ${
            tokenDetails?.symbol || ""
          }`.replace(/^ +/gm, "") // Remove indentation for cleaner output
        );
      }

      // Check if the token is owned by the property lister
      if (property.lister) {
        const lister = await mongoose.model("User").findById(property.lister);
        if (lister && lister.walletAddress) {
          const [listerTokenBalance, listerEthBalance] = await Promise.all([
            getTokenBalance(tokenContract, lister.walletAddress),
            getEthBalance(lister.walletAddress),
          ]);
          console.log(`\nProperty Lister (${lister.email}):`);
          console.log(`Wallet: ${lister.walletAddress}`);
          console.log(
            `ETH Balance: ${parseFloat(listerEthBalance).toFixed(4)} ETH`
          );
          console.log(
            `${
              tokenDetails?.symbol || "Token"
            } Balance: ${listerTokenBalance} ${tokenDetails?.symbol || ""}`
          );
        }
      }
    }

    console.log("\nToken balance check completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error in checkTokenBalances:", error);
    process.exit(1);
  }
};

// Run the script
main();
