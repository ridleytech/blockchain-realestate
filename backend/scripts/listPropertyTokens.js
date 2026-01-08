const ethers = require("ethers");
require("dotenv").config();

const PropertyNFTABI = require("../../frontend/src/contracts/PropertyNFT.json");

async function listPropertyTokens() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545"
  );
  const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

  const propertyNFT = new ethers.Contract(
    process.env.PROPERTY_NFT_CONTRACT_ADDRESS,
    PropertyNFTABI.abi,
    wallet
  );

  // Get the token counter to know how many tokens exist
  const tokenIdCounter = await propertyNFT._tokenIdCounter();
  console.log(`Total tokens in contract: ${tokenIdCounter}`);

  // List all tokens
  for (let i = 1; i < tokenIdCounter; i++) {
    try {
      const owner = await propertyNFT.ownerOf(i);
      const prop = await propertyNFT.properties(i);
      console.log(`\nToken ID: ${i}`);
      console.log(`Owner: ${owner}`);
      console.log(`Title: ${prop.title}`);
      console.log(`Location: ${prop.location}`);
      console.log(`Price: ${ethers.utils.formatEther(prop.price)} ETH`);
      console.log(`Size: ${prop.size} sq ft`);
      console.log(`Total Shares: ${prop.totalShares}`);
      console.log(`Is Listed: ${prop.isListed}`);
      console.log(`Fractional Token: ${prop.fractionalToken}`);
    } catch (error) {
      // Token might not exist
      console.log(`Token ${i} does not exist or error: ${error.message}`);
    }
  }
}

listPropertyTokens().catch(console.error);
