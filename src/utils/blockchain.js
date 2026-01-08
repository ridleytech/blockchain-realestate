import Web3 from "web3";
import FractionalTokenABI from "../contracts/FractionalToken.json";

let web3;
let isInitialized = false;

// Safe wrapper for eth_requestAccounts
const safeRequestAccounts = async () => {
  try {
    if (window.ethereum) {
      return await window.ethereum.request({ method: "eth_requestAccounts" });
    }
    return [];
  } catch (error) {
    console.error("Error requesting accounts:", error);
    return [];
  }
};

// Initialize Web3
const initWeb3 = async () => {
  if (isInitialized) return web3;

  if (typeof window !== "undefined" && window.ethereum) {
    try {
      const accounts = await safeRequestAccounts();
      web3 = new Web3(window.ethereum);
      // Request account access if needed
      await window.ethereum.enable();
      isInitialized = true;
      return web3;
    } catch (error) {
      console.error("Error initializing Web3 with MetaMask:", error);
      // Fall through to read-only mode
    }
  }

  // Fallback to read-only mode
  web3 = new Web3(
    new Web3.providers.HttpProvider(
      process.env.REACT_APP_BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545"
    )
  );
  isInitialized = true;
  return web3;
};

// Initialize web3 immediately if in browser
if (typeof window !== "undefined") {
  initWeb3().catch(console.error);
}

// Get the current account
const getCurrentAccount = async () => {
  try {
    await initWeb3(); // Ensure web3 is initialized
    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please connect your wallet.");
    }
    return accounts[0];
  } catch (error) {
    console.error("Error getting current account:", error);
    throw error;
  }
};

// Get the FractionalToken contract instance
const getFractionalTokenContract = (tokenAddress) => {
  return new web3.eth.Contract(FractionalTokenABI.abi, tokenAddress);
};

// Purchase shares of a property
const purchaseShares = async (tokenAddress, shares) => {
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

    // Get contract instance with proper ABI
    const contract = getFractionalTokenContract(tokenAddress);

    if (!contract || !contract.methods) {
      throw new Error("Failed to initialize contract instance");
    }

    // Verify the contract has the required methods
    const requiredMethods = ["buyShares", "pricePerShare"];
    for (const method of requiredMethods) {
      if (typeof contract.methods[method] !== "function") {
        throw new Error(`Contract is missing required method: ${method}`);
      }
    }

    // Convert shares to a number and validate
    const sharesNum = Number(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      throw new Error("Invalid number of shares");
    }

    // Get the price per share from the contract
    const pricePerShare = await contract.methods.pricePerShare().call({
      from: accounts[0],
    });

    if (!pricePerShare) {
      throw new Error("Failed to get price per share from contract");
    }

    const pricePerShareBN = web3.utils.toBN(pricePerShare);
    const sharesBN = web3.utils.toBN(sharesNum.toString());
    const totalPriceInWei = pricePerShareBN.mul(sharesBN);

    console.log("Purchase details:", {
      shares: sharesNum,
      pricePerShare: pricePerShare.toString(),
      priceInEth: web3.utils.fromWei(pricePerShare, "ether"),
      totalPriceInWei: totalPriceInWei.toString(),
      totalPriceInEth: web3.utils.fromWei(totalPriceInWei.toString(), "ether"),
      contractAddress: tokenAddress,
      account: accounts[0],
    });

    // First check if the contract is tradable
    const isTradable = await contract.methods
      .isTradable()
      .call({ from: accounts[0] });
    if (!isTradable) {
      throw new Error("Trading is not enabled for this token");
    }

    // Prepare the transaction
    const method = contract.methods.buyShares(sharesNum.toString());

    // Estimate gas
    const gasEstimate = await method
      .estimateGas({
        from: accounts[0],
        value: totalPriceInWei.toString(),
      })
      .catch((err) => {
        console.error("Gas estimation failed:", err);
        throw new Error(`Gas estimation failed: ${err.message}`);
      });

    console.log("Gas estimate:", gasEstimate);

    // Send transaction with exact ETH amount
    const tx = await method.send({
      from: accounts[0],
      value: totalPriceInWei.toString(),
      gas: Math.ceil(gasEstimate * 1.2), // Add 20% buffer for safety
    });

    if (!tx || !tx.transactionHash) {
      throw new Error("Transaction failed: No transaction hash received");
    }

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
    if (!tokenAddress || !web3.utils.isAddress(tokenAddress)) {
      throw new Error("Invalid token address");
    }

    const contract = getFractionalTokenContract(tokenAddress);
    const [name, symbol, totalSupply, pricePerShare, isTradable, owner] =
      await Promise.all([
        contract.methods.name().call(),
        contract.methods.symbol().call(),
        contract.methods.totalSupply().call(),
        contract.methods.pricePerShare().call(),
        contract.methods.isTradable().call(),
        contract.methods.owner().call(),
      ]);

    return {
      name,
      symbol,
      totalSupply: web3.utils.fromWei(totalSupply, "ether"),
      pricePerShare: web3.utils.fromWei(pricePerShare, "ether"),
      isTradable,
      owner,
      totalSupplyNum: parseInt(totalSupply, 10),
      sharePrice: parseFloat(web3.utils.fromWei(pricePerShare, "ether")),
    };
  } catch (error) {
    console.error("Error getting property details:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get current ETH price in USD
const getEthPriceInUsd = async () => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    console.error("Error fetching ETH price:", error);
    // Fallback price in case the API call fails
    return 3000; // Adjust this as needed
  }
};

export {
  web3,
  getCurrentAccount,
  getFractionalTokenContract,
  purchaseShares,
  getShareBalance,
  getPropertyDetails,
  getEthPriceInUsd,
};
