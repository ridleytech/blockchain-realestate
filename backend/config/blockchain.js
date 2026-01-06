require("dotenv").config();

module.exports = {
  networks: {
    development: {
      url: process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545",
      chainId: process.env.CHAIN_ID || 1337, // Default to Ganache
    },
    // Add other networks as needed (ropsten, rinkeby, mainnet, etc.)
  },
  contractAddresses: {
    propertyNFT: process.env.PROPERTY_NFT_CONTRACT_ADDRESS,
    fractionalTokenFactory: process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS,
  },
  // Gas settings
  gas: {
    default: "500000",
    mint: "500000",
    transfer: "21000",
  },
  // Contract ABIs will be loaded from build artifacts
};

// Validate required environment variables
const requiredEnvVars = [
  "BLOCKCHAIN_PROVIDER_URL",
  "PROPERTY_NFT_CONTRACT_ADDRESS",
  "FRACTIONAL_TOKEN_FACTORY_ADDRESS",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(
    "Warning: The following required environment variables are not set:"
  );
  missingVars.forEach((varName) => console.warn(`- ${varName}`));
  console.warn("Please set these in your .env file");
}
