import Web3 from "web3";
import FractionalTokenABI from "../contracts/FractionalToken.json";

let web3;

// Safe wrapper for eth_requestAccounts
const safeRequestAccounts = async () => {
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    return true;
  } catch (error) {
    console.warn("User denied account access or popup was closed");
    return false;
  }
};

// Initialize Web3
if (typeof window !== "undefined" && window.ethereum) {
  (async () => {
    try {
      const accountsConnected = await safeRequestAccounts();
      if (accountsConnected) {
        web3 = new Web3(window.ethereum);
      } else {
        // Fallback to read-only mode
        web3 = new Web3(
          new Web3.providers.HttpProvider(
            process.env.REACT_APP_BLOCKCHAIN_PROVIDER_URL ||
              "http://localhost:7545"
          )
        );
      }
    } catch (error) {
      console.error("Error initializing Web3:", error);
      // Fallback to read-only mode
      web3 = new Web3(
        new Web3.providers.HttpProvider(
          process.env.REACT_APP_BLOCKCHAIN_PROVIDER_URL ||
            "http://localhost:7545"
        )
      );
    }
  })();
} else {
  // Fallback to read-only mode
  web3 = new Web3(
    new Web3.providers.HttpProvider(
      process.env.REACT_APP_BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545"
    )
  );
}

// Get the current account
const getCurrentAccount = async () => {
  const accounts = await web3.eth.getAccounts();
  return accounts[0];
};

// Get the FractionalToken contract instance
const getFractionalTokenContract = (tokenAddress) => {
  return new web3.eth.Contract(FractionalTokenABI.abi, tokenAddress);
};

// Purchase shares of a property
const purchaseShares = async (tokenAddress, shares, ethAmount) => {
  try {
    // Validate token address
    if (!tokenAddress || !web3.utils.isAddress(tokenAddress)) {
      throw new Error("Invalid token address provided");
    }

    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please connect your wallet.");
    }

    console.log("Using token address:", tokenAddress);
    const contract = getFractionalTokenContract(tokenAddress);

    if (!contract || !contract.methods || !contract.methods.buyShares) {
      console.error("Contract methods not properly initialized:", contract);
      throw new Error(
        "Failed to initialize contract. Please check the token address."
      );
    }

    // Convert ETH to Wei
    const amountInWei = web3.utils.toWei(ethAmount.toString(), "ether");

    console.log("Estimating gas...");
    // Estimate gas
    const gasEstimate = await contract.methods.buyShares(shares).estimateGas({
      from: accounts[0],
      value: amountInWei,
    });

    console.log("Sending transaction...");
    // Send transaction
    const tx = await contract.methods.buyShares(shares).send({
      from: accounts[0],
      value: amountInWei,
      gas: Math.ceil(gasEstimate * 1.1), // Add 10% buffer
    });

    return {
      success: true,
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
    };
  } catch (error) {
    console.error("Error purchasing shares:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get user's share balance
const getShareBalance = async (tokenAddress, userAddress) => {
  try {
    const contract = getFractionalTokenContract(tokenAddress);
    const balance = await contract.methods.balanceOf(userAddress).call();
    return {
      success: true,
      balance: parseInt(balance, 10),
    };
  } catch (error) {
    console.error("Error getting share balance:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get property details from token contract
const getPropertyDetails = async (tokenAddress) => {
  try {
    const contract = getFractionalTokenContract(tokenAddress);
    const [name, symbol, totalSupply, sharePrice] = await Promise.all([
      contract.methods.name().call(),
      contract.methods.symbol().call(),
      contract.methods.totalSupply().call(),
      contract.methods.sharePrice().call(),
    ]);

    return {
      success: true,
      data: {
        name,
        symbol,
        totalSupply: parseInt(totalSupply, 10),
        sharePrice: parseFloat(web3.utils.fromWei(sharePrice, "ether")),
      },
    };
  } catch (error) {
    console.error("Error getting property details:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export {
  web3,
  getCurrentAccount,
  getFractionalTokenContract,
  purchaseShares,
  getShareBalance,
  getPropertyDetails,
};
