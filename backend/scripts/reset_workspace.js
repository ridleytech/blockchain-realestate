const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// Configuration
const CONFIG = {
  backendEnvPath: path.join(__dirname, "../.env"),
  frontendEnvPath: path.join(__dirname, "../.env"),
  mongodbUri:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/blockchain-real-estate",
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY,
  adminAddress: process.env.ADMIN_ADDRESS,
  contractsBuildDir: path.join(__dirname, "../../build/contracts"), // Updated this line
  srcContractsDir: path.join(__dirname, "../src/contracts"),
  contractsToCopy: [
    "PropertyNFT.json",
    "FractionalToken.json",
    "FractionalTokenFactory.json",
  ],
};

// Parse deployment output from terminal
function parseDeploymentOutput(output) {
  const lines = output.split("\n");
  const result = {
    propertyNFT: "",
    fractionalTokenFactory: "",
    fractionalTokens: [], // Store all deployed FractionalToken addresses
  };

  let currentContract = null;

  for (const line of lines) {
    if (line.includes("Deploying")) {
      if (line.includes("PropertyNFT")) currentContract = "PropertyNFT";
      else if (line.includes("FractionalTokenFactory"))
        currentContract = "FractionalTokenFactory";
      else if (line.includes("FractionalToken"))
        currentContract = "FractionalToken";
      else currentContract = null;
    } else if (line.includes("contract address:") && currentContract) {
      const address = line.split("contract address:")[1].trim();
      if (currentContract === "PropertyNFT") {
        result.propertyNFT = address;
      } else if (currentContract === "FractionalTokenFactory") {
        result.fractionalTokenFactory = address;
      } else if (currentContract === "FractionalToken") {
        result.fractionalTokens.push(address);
      }
    }
  }

  return result;
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

    // Get all properties
    const properties = await Property.find({});

    // Update each property with the corresponding token address
    for (
      let i = 0;
      i < Math.min(properties.length, contracts.fractionalTokens.length);
      i++
    ) {
      const property = properties[i];
      property.fractionalToken = contracts.fractionalTokens[i];
      await property.save();
      console.log(
        `✅ Updated property ${property._id} with token address: ${property.fractionalToken}`
      );
    }

    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error updating database:", error.message);
    throw error;
  }
}

// Copy contract ABIs to src/contracts
function copyContractABIs() {
  try {
    // Ensure source and destination directories exist
    if (!fs.existsSync(CONFIG.contractsBuildDir)) {
      throw new Error(`Build directory not found: ${CONFIG.contractsBuildDir}`);
    }

    // Create destination directory if it doesn't exist
    if (!fs.existsSync(CONFIG.srcContractsDir)) {
      fs.mkdirSync(CONFIG.srcContractsDir, { recursive: true });
    }

    // Copy each contract file
    CONFIG.contractsToCopy.forEach((contractFile) => {
      const sourcePath = path.join(CONFIG.contractsBuildDir, contractFile);
      const destPath = path.join(CONFIG.srcContractsDir, contractFile);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied ${contractFile} to src/contracts`);
      } else {
        console.warn(`⚠️  Contract file not found: ${sourcePath}`);
      }
    });
  } catch (error) {
    console.error("❌ Error copying contract ABIs:", error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log("🚀 Starting workspace reset process...\n");

  try {
    // Step 1: Compile contracts
    console.log("🔄 Compiling contracts...");
    execSync("truffle compile", { stdio: "inherit" });

    // Step 2: Copy contract ABIs to src/contracts
    console.log("\n📄 Copying contract ABIs to src/contracts...");
    copyContractABIs();

    // Step 3: Deploy contracts
    console.log("\n🔄 Deploying contracts...");
    const deployOutput = execSync(
      "truffle migrate --reset --network development",
      {
        cwd: __dirname,
        encoding: "utf8",
      }
    );
    console.log("✅ Contracts deployed successfully\n");

    // Step 4: Parse contract addresses
    console.log("🔍 Parsing contract addresses...");
    const { propertyNFT, fractionalTokenFactory, fractionalTokens } =
      parseDeploymentOutput(deployOutput);

    if (!propertyNFT || !fractionalTokenFactory) {
      throw new Error(
        "Failed to parse contract addresses from deployment output"
      );
    }

    console.log(`📝 Contract Addresses:`);
    console.log(`- PropertyNFT: ${propertyNFT}`);
    console.log(`- FractionalTokenFactory: ${fractionalTokenFactory}`);
    console.log(`- FractionalTokens:`, fractionalTokens);

    // Step 5: Update environment files
    console.log("\n📝 Updating environment files...");

    // Update backend .env
    updateEnvFile(CONFIG.backendEnvPath, {
      PROPERTY_NFT_CONTRACT: propertyNFT,
      PROPERTY_NFT_CONTRACT_ADDRESS: propertyNFT,
      FRACTIONAL_TOKEN_FACTORY_ADDRESS: fractionalTokenFactory,
      ADMIN_PRIVATE_KEY: CONFIG.adminPrivateKey,
      ADMIN_ADDRESS: CONFIG.adminAddress,
    });

    // Update frontend .env
    updateEnvFile(CONFIG.frontendEnvPath, {
      REACT_APP_PROPERTY_NFT_ADDRESS: propertyNFT,
      REACT_APP_FRACTIONAL_TOKEN_FACTORY_ADDRESS: fractionalTokenFactory,
      REACT_APP_NETWORK_ID: "1337",
      REACT_APP_CHAIN_ID: "1337",
      REACT_APP_BLOCKCHAIN_PROVIDER_URL: "http://localhost:7545",
    });

    // Step 6: Update database with contract addresses
    console.log("\n🔄 Updating database with token addresses...");
    await updateDatabase({
      propertyNFT,
      fractionalTokenFactory,
      fractionalTokens,
    });

    console.log("\n✨ Workspace reset completed successfully! ✨");
    console.log("\nNext steps:");
    console.log("1. Restart your backend server");
    console.log("2. Restart your frontend development server");
    console.log("3. Test the purchase flow with the updated contracts");
  } catch (error) {
    console.error("\n❌ Error during workspace reset:", error.message);
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
