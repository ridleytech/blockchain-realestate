const Web3 = require("web3");
require("dotenv").config({ path: ".env" });

// Contract ABIs
const factoryABI = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "getTokenByPropertyId",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllTokens",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "enableTradingOnToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
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
    name: "enableTrading",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

async function enableTrading() {
  try {
    // Connect to the blockchain
    const web3 = new Web3(
      process.env.REACT_APP_BLOCKCHAIN_PROVIDER_URL || "http://127.0.0.1:7545"
    );

    // Get the default account (first account in Ganache)
    const accounts = await web3.eth.getAccounts();
    const adminAccount = accounts[0];
    console.log("Using admin account:", adminAccount);

    // Get the factory contract
    const factoryAddress =
      process.env.REACT_APP_FRACTIONAL_TOKEN_FACTORY_CONTRACT_ADDRESS;
    if (!factoryAddress) {
      throw new Error("Factory contract address not found in .env");
    }

    const factory = new web3.eth.Contract(factoryABI, factoryAddress);

    // Get the owner of the factory
    const factoryOwner = await factory.methods.owner().call();
    console.log("Factory owner:", factoryOwner);

    // Check if the admin account is the owner
    if (adminAccount.toLowerCase() !== factoryOwner.toLowerCase()) {
      console.warn(
        "Warning: Admin account is not the owner of the factory contract"
      );
      console.warn(`Admin account: ${adminAccount}`);
      console.warn(`Factory owner: ${factoryOwner}`);
      console.warn(
        "This script may fail if the admin account doesn't have the right permissions"
      );
    }

    // Get all tokens from the factory
    console.log("Getting all tokens from factory...");
    let tokens = [];

    try {
      // Try to use getAllTokens if it exists
      tokens = await factory.methods.getAllTokens().call();
      console.log(`Found ${tokens.length} tokens`);
    } catch (error) {
      console.log(
        "getAllTokens not available, trying to get tokens one by one..."
      );
      // If getAllTokens doesn't exist, try to get tokens one by one
      let i = 0;
      while (true) {
        try {
          const token = await factory.methods.getTokenByPropertyId(i).call();
          if (token === "0x0000000000000000000000000000000000000000") {
            break;
          }
          tokens.push(token);
          i++;
        } catch (error) {
          console.error("Error getting token:", error);
          break;
        }
      }
      console.log(`Found ${tokens.length} tokens`);
    }

    if (tokens.length === 0) {
      console.log("No tokens found to enable trading for");
      return;
    }

    // Enable trading on each token
    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      console.log(
        `\nProcessing token ${i + 1}/${tokens.length}: ${tokenAddress}`
      );

      try {
        const token = new web3.eth.Contract(tokenABI, tokenAddress);

        // Check if trading is already enabled
        const isTradable = await token.methods.isTradable().call();

        if (isTradable) {
          console.log(`Trading is already enabled for token ${tokenAddress}`);
          continue;
        }

        // Try to enable trading directly on the token
        try {
          console.log(`Enabling trading on token ${tokenAddress}...`);
          const receipt = await token.methods
            .enableTrading()
            .send({ from: adminAccount });
          console.log(
            `✅ Successfully enabled trading for token ${tokenAddress}`
          );
          console.log(`Transaction hash: ${receipt.transactionHash}`);
        } catch (tokenError) {
          console.warn(
            `Failed to enable trading directly on token ${tokenAddress}:`,
            tokenError.message
          );

          // If direct enable fails, try using the factory's enableTradingOnToken
          try {
            console.log(`Trying to enable trading through factory...`);
            const receipt = await factory.methods
              .enableTradingOnToken(tokenAddress)
              .send({ from: adminAccount });
            console.log(
              `✅ Successfully enabled trading for token ${tokenAddress} via factory`
            );
            console.log(`Transaction hash: ${receipt.transactionHash}`);
          } catch (factoryError) {
            console.error(
              `❌ Failed to enable trading for token ${tokenAddress}:`,
              factoryError.message
            );
          }
        }
      } catch (error) {
        console.error(`Error processing token ${tokenAddress}:`, error.message);
      }
    }

    console.log("\nTrading enablement process completed!");
  } catch (error) {
    console.error("Error in enableTrading:", error);
  }
}

// Run the script
enableTrading();
