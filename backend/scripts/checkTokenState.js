require("dotenv").config();
const { ethers } = require("ethers");

// Contract addresses
const TOKEN_ADDRESS = "0x2b79aC5aaDc3ae70FAb8d841645F0Ff0a3eA81fC";
const BUYER_ADDRESS = "0xED1bA060692529272B773495bBAee8f7836e3f66";
const OWNER_ADDRESS = "0x0B97ac9EF3b670b5946FD8F22Af79F8cAf49b21c";

// Initialize provider
const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_NODE_URL || "http://127.0.0.1:7545"
);

// ABI for basic ERC20 functions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function isTradable() view returns (bool)",
  "function owner() view returns (address)",
];

async function checkTokenState() {
  try {
    const tokenContract = new ethers.Contract(
      TOKEN_ADDRESS,
      ERC20_ABI,
      provider
    );

    console.log("=== Token Information ===");
    const [name, symbol, decimals, totalSupply, isTradable, owner] =
      await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
        tokenContract.isTradable
          ? tokenContract.isTradable().catch(() => false)
          : false,
        tokenContract.owner
          ? tokenContract.owner().catch(() => "No owner function")
          : "No owner function",
      ]);

    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(
      `Total Supply: ${ethers.utils.formatUnits(
        totalSupply,
        decimals
      )} ${symbol}`
    );
    console.log(`Is Tradable: ${isTradable}`);
    console.log(`Owner: ${owner}`);

    console.log("\n=== Balances ===");
    const [ownerBalance, buyerBalance] = await Promise.all([
      tokenContract.balanceOf(OWNER_ADDRESS),
      tokenContract.balanceOf(BUYER_ADDRESS),
    ]);

    console.log(
      `Owner (${OWNER_ADDRESS}): ${ethers.utils.formatUnits(
        ownerBalance,
        decimals
      )} ${symbol}`
    );
    console.log(
      `Buyer (${BUYER_ADDRESS}): ${ethers.utils.formatUnits(
        buyerBalance,
        decimals
      )} ${symbol}`
    );

    // Check allowance if needed
    console.log("\n=== Allowance ===");
    try {
      const allowance = await tokenContract.allowance(
        OWNER_ADDRESS,
        BUYER_ADDRESS
      );
      console.log(
        `Allowance (Owner -> Buyer): ${ethers.utils.formatUnits(
          allowance,
          decimals
        )} ${symbol}`
      );
    } catch (e) {
      console.log("Could not check allowance:", e.message);
    }
  } catch (error) {
    console.error("Error checking token state:", error);
  }
}

checkTokenState().catch(console.error);
