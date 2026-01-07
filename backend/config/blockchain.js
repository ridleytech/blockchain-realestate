require("dotenv").config();
const { Web3 } = require("web3");
const path = require("path");
const fs = require("fs");

// Initialize Web3
const providerUrl =
  process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545";
const web3 = new Web3(providerUrl);

// Load contract ABIs
const loadABI = (contractName) => {
  try {
    const buildDir = path.join(__dirname, "../../build/contracts");
    const artifact = JSON.parse(
      fs.readFileSync(`${buildDir}/${contractName}.json`, "utf8")
    );
    return artifact.abi;
  } catch (err) {
    console.error(`Error loading ${contractName} ABI:`, err);
    throw err;
  }
};

// Get contract instance
const getContract = (contractName, address) => {
  const abi = loadABI(contractName);
  return new web3.eth.Contract(abi, address);
};

module.exports = {
  web3,
  getContract,
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
  loadABI,

  // Helper to parse transaction events
  parseEventLogs: (receipt, eventName) => {
    if (!receipt.events) return [];
    const event = receipt.events[eventName];
    return event ? (Array.isArray(event) ? event : [event]) : [];
  },

  // Helper to get current gas price with buffer
  getGasPrice: async (bufferPercent = 10) => {
    const gasPrice = await web3.eth.getGasPrice();
    const buffer = (gasPrice * bufferPercent) / 100;
    return Math.ceil(Number(gasPrice) + buffer).toString();
  },

  // Helper to estimate gas with buffer
  estimateGasWithBuffer: async (
    txObject,
    from,
    value = "0",
    bufferPercent = 10
  ) => {
    const gas = await txObject.estimateGas({ from, value });
    const buffer = (gas * bufferPercent) / 100;
    return Math.ceil(gas + buffer);
  },

  // Helper to send transaction with retry logic
  sendTransaction: async (
    txObject,
    from,
    privateKey,
    value = "0",
    gas = null,
    gasPrice = null
  ) => {
    try {
      if (!gas) {
        gas = await txObject.estimateGas({ from, value });
      }

      if (!gasPrice) {
        gasPrice = await web3.eth.getGasPrice();
      }

      const txData = {
        from,
        to: txObject._parent._address,
        data: txObject.encodeABI(),
        gas: Math.ceil(gas * 1.1), // 10% buffer
        gasPrice: Math.ceil(gasPrice * 1.1), // 10% buffer
        value,
      };

      const signedTx = await web3.eth.accounts.signTransaction(
        txData,
        privateKey
      );
      const receipt = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );

      return receipt;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  },
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
