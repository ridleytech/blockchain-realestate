const fs = require("fs-extra");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// Configuration
const CONFIG = {
  backendEnvPath: path.join(__dirname, "../.env"),
  frontendEnvPath: path.join(__dirname, "../../frontend/.env"),
  mongodbUri:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/blockchain-real-estate",
  contractsBuildDir: path.join(__dirname, "../../build/contracts"),
  srcContractsDir: path.join(__dirname, "../src/contracts"),
  frontendContractsDir: path.join(__dirname, "../../frontend/src/contracts"),
  contractsToCopy: [
    "PropertyNFT.json",
    "FractionalToken.json",
    "FractionalTokenFactory.json",
  ],
};

// Get deployed contract addresses from build files and deployment log
function getDeployedAddresses() {
  const addresses = {
    propertyNFT: "",
    fractionalTokenFactory: "",
    fractionalTokens: {},
  };

  try {
    // Try to get addresses from deployment log first
    const deploymentLogPath = path.join(__dirname, "../../deployment-log.json");
    if (fs.existsSync(deploymentLogPath)) {
      const deploymentLog = JSON.parse(
        fs.readFileSync(deploymentLogPath, "utf8")
      );

      // Get addresses from deployment log
      addresses.propertyNFT = deploymentLog.propertyNFT || "";
      addresses.fractionalTokenFactory =
        deploymentLog.fractionalTokenFactory || "";

      // Convert token IDs to numbers since they're stored as strings in JSON
      if (deploymentLog.fractionalTokens) {
        Object.entries(deploymentLog.fractionalTokens).forEach(
          ([tokenId, address]) => {
            addresses.fractionalTokens[parseInt(tokenId)] = address;
          }
        );
      }

      console.log("✅ Loaded contract addresses from deployment log");
      return addresses;
    }

    console.log(
      "⚠️  No deployment log found, trying to get addresses from build files..."
    );

    // Fallback to getting addresses from build files if no deployment log is found
    // Get PropertyNFT address
    const propertyNFT = require(path.join(
      CONFIG.contractsBuildDir,
      "PropertyNFT.json"
    ));
    if (propertyNFT.networks) {
      const networkId = Object.keys(propertyNFT.networks)[0];
      if (networkId) {
        addresses.propertyNFT = propertyNFT.networks[networkId].address;
      }
    }

    // Get FractionalTokenFactory address
    const factory = require(path.join(
      CONFIG.contractsBuildDir,
      "FractionalTokenFactory.json"
    ));
    if (factory.networks) {
      const networkId = Object.keys(factory.networks)[0];
      if (networkId) {
        addresses.fractionalTokenFactory = factory.networks[networkId].address;
      }
    }

    // Note: We can't get token addresses from build files as they're dynamically deployed
    console.warn(
      "⚠️  Token addresses not available from build files. Only contract addresses will be updated."
    );

    return addresses;
  } catch (error) {
    console.error("❌ Error reading contract addresses:", error);
    process.exit(1);
  }
}

// Update environment file
function updateEnvFile(filePath, updates) {
  try {
    let envContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "";

    // Update or add each environment variable
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*`, "m");
      const newLine = `${key}=${value}`;

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += `\n${newLine}\n`;
      }
    }

    fs.writeFileSync(filePath, envContent.trim() + "\n");
    console.log(`✅ Updated ${path.basename(filePath)}`);

    // Log the updates
    console.log("\nUpdated environment variables:");
    for (const [key, value] of Object.entries(updates)) {
      console.log(`${key}=${value}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update database with contract addresses
async function updateDatabase(contracts) {
  try {
    // Connect to MongoDB
    await mongoose.connect(CONFIG.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("\nConnected to MongoDB");

    const Property = require("../models/Property");
    const User = require("../models/User");

    // Get or create an admin user to use as lister
    let adminUser = await User.findOne({ role: "admin" });

    if (!adminUser) {
      console.log("No admin user found, creating one...");
      // Create a default admin user if none exists
      adminUser = new User({
        name: "Admin User",
        email: "admin@example.com",
        password: "changeme123", // In a real app, this should be hashed
        role: "admin",
        walletAddress: "0x" + "0".repeat(40), // Default wallet address
      });
      await adminUser.save();
      console.log("✅ Created default admin user");
    }

    // Get all properties
    const properties = await Property.find({});

    // First, log all token IDs and their corresponding addresses for debugging
    console.log(
      "\nAvailable token addresses:",
      JSON.stringify(contracts.fractionalTokens, null, 2)
    );

    // Update each property with contract addresses and required fields
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];

      // Try to find the token address by tokenId (from 1 to 6 for the example properties)
      // If the property has a tokenId field, use that, otherwise use the array index + 1
      const tokenId = property.tokenId || i + 1;
      const tokenAddress = contracts.fractionalTokens[tokenId] || "";

      // Only update the fields we need to update
      const updates = {
        contractAddress: contracts.propertyNFT,
        isListed: true,
        updatedAt: new Date(),
      };

      // Only update token address if we have one
      if (tokenAddress) {
        updates.fractionalToken = tokenAddress;
      }

      // Add lister if not set
      if (!property.lister) {
        updates.lister = adminUser._id;
      }

      // Update the property with timestamps
      await Property.findByIdAndUpdate(
        property._id,
        { $set: updates },
        { new: true, timestamps: true }
      );

      console.log(
        `✅ Updated property ${i + 1}/${properties.length}: ${property.title}`
      );
      console.log(`   - NFT Contract: ${updates.contractAddress}`);
      console.log(`   - Token ID: ${tokenId}`);
      console.log(`   - Token Address: ${tokenAddress || "Not found"}`);
    }

    console.log("\n✅ Successfully updated all properties in the database");
  } catch (error) {
    console.error("❌ Error updating database:", error);
    throw error; // Re-throw to handle in main function
  } finally {
    await mongoose.disconnect();
  }
}

// Copy contract ABIs to src/contracts and frontend
function copyContractABIs() {
  try {
    // Ensure directories exist
    fs.ensureDirSync(CONFIG.srcContractsDir);
    fs.ensureDirSync(CONFIG.frontendContractsDir);

    // Copy each contract ABI
    CONFIG.contractsToCopy.forEach((contractFile) => {
      const sourcePath = path.join(CONFIG.contractsBuildDir, contractFile);
      const destBackendPath = path.join(CONFIG.srcContractsDir, contractFile);
      const destFrontendPath = path.join(
        CONFIG.frontendContractsDir,
        contractFile
      );

      if (fs.existsSync(sourcePath)) {
        // Copy to backend
        fs.copyFileSync(sourcePath, destBackendPath);
        console.log(`✅ Copied ${contractFile} to backend contracts`);

        // Copy to frontend
        fs.copyFileSync(sourcePath, destFrontendPath);
        console.log(`✅ Copied ${contractFile} to frontend contracts`);
      } else {
        console.warn(`⚠️  Contract file not found: ${sourcePath}`);
      }
    });
  } catch (error) {
    console.error("❌ Error copying contract ABIs:", error);
  }
}

// Main function
async function main() {
  console.log("🚀 Starting contract address update process...");

  try {
    // Get deployed contract addresses
    const contracts = getDeployedAddresses();
    console.log("\n📝 Found deployed contracts:");
    console.log(`- PropertyNFT: ${contracts.propertyNFT}`);
    console.log(
      `- FractionalTokenFactory: ${contracts.fractionalTokenFactory}`
    );
    console.log(
      `- FractionalTokens: ${
        Object.keys(contracts.fractionalTokens).length
      } tokens found`
    );

    // Update environment variables
    const envUpdates = {
      PROPERTY_NFT_CONTRACT: contracts.propertyNFT,
      FRACTIONAL_TOKEN_FACTORY: contracts.fractionalTokenFactory,
    };

    // Update backend .env
    updateEnvFile(CONFIG.backendEnvPath, envUpdates);

    // Update frontend .env if it exists
    if (fs.existsSync(CONFIG.frontendEnvPath)) {
      updateEnvFile(CONFIG.frontendEnvPath, envUpdates);
    }

    // Update database with contract addresses
    await updateDatabase(contracts);

    // Copy contract ABIs
    copyContractABIs();

    console.log("\n✨ Contract update process completed successfully!");
  } catch (error) {
    console.error("❌ Error in main process:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = { main };
