const Web3 = require("web3");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Load contract ABIs
const FractionalTokenFactory = require("../../build/contracts/FractionalTokenFactory.json");
const FractionalToken = require("../../build/contracts/FractionalToken.json");

async function enableAllTrading() {
  try {
    console.log("Loading configuration...");

    const rpcUrl =
      process.env.BLOCKCHAIN_URL ||
      process.env.BLOCKCHAIN_PROVIDER_URL ||
      "http://localhost:7545";

    console.log(`Connecting to blockchain at ${rpcUrl}`);

    // Connect to the blockchain
    const web3 = new Web3(rpcUrl);

    // Get the first account from Ganache
    const accounts = await web3.eth.getAccounts();
    if (accounts.length === 0) {
      throw new Error("No accounts found. Is Ganache running?");
    }

    const adminAccount = accounts[0];
    console.log(`Using account: ${adminAccount}`);

    // Set the default account for transactions
    web3.eth.defaultAccount = adminAccount;

    console.log(`Using admin account: ${adminAccount.address}`);

    // Get the factory contract
    const networkId = await web3.eth.net.getId();
    const factoryAddress =
      FractionalTokenFactory.networks[networkId]?.address ||
      process.env.FRACTIONAL_TOKEN_FACTORY_ADDRESS ||
      process.env.REACT_APP_FRACTIONAL_TOKEN_FACTORY_CONTRACT_ADDRESS;

    if (!factoryAddress) {
      throw new Error("Factory contract address not found");
    }

    const factory = new web3.eth.Contract(
      FractionalTokenFactory.abi,
      factoryAddress
    );

    console.log(`Connected to factory at ${factoryAddress}`);

    // Get all FractionalTokenCreated events to find deployed tokens
    console.log("Searching for FractionalTokenCreated events...");
    const events = await factory.getPastEvents("FractionalTokenCreated", {
      fromBlock: 0,
      toBlock: "latest",
    });

    const tokens = events.map((event) => event.returnValues.fractionalToken);
    console.log(`Found ${tokens.length} tokens from events`);

    if (tokens.length === 0) {
      console.log("No tokens found");
      return;
    }

    console.log(`\n=== Enabling trading for ${tokens.length} tokens ===`);

    // Process each token
    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      console.log(
        `\n[${i + 1}/${tokens.length}] Processing token: ${tokenAddress}`
      );

      try {
        const token = new web3.eth.Contract(FractionalToken.abi, tokenAddress);

        // Check current status
        const isTradable = await token.methods.isTradable().call();
        console.log(
          `Current trading status: ${isTradable ? "Enabled" : "Disabled"}`
        );

        if (isTradable) {
          console.log("Trading already enabled, skipping...");
          continue;
        }

        // Get the owner of the token
        const owner = await token.methods.owner().call();
        console.log(`Token owner: ${owner}`);

        // Check if the admin is the owner
        if (owner.toLowerCase() !== adminAccount.address.toLowerCase()) {
          console.warn(
            "WARNING: Admin is not the owner of this token. Trading cannot be enabled."
          );
          continue;
        }

        // Enable trading
        console.log("Enabling trading...");
        const receipt = await token.methods
          .enableTrading()
          .send({ from: adminAccount.address, gas: 500000 });

        console.log(
          `✅ Trading enabled. Transaction hash: ${receipt.transactionHash}`
        );

        // Verify
        const newStatus = await token.methods.isTradable().call();
        console.log(
          `New trading status: ${newStatus ? "Enabled" : "Disabled"}`
        );
      } catch (error) {
        console.error(`Error processing token ${tokenAddress}:`, error.message);
      }
    }

    console.log("\n=== Trading enablement process completed ===");
  } catch (error) {
    console.error("Error in enableAllTrading:", error);
    process.exit(1);
  }
}

// Run the script
enableAllTrading();
