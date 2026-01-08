const ethers = require("ethers");
require("dotenv").config();

const PropertyNFTABI = require("../../frontend/src/contracts/PropertyNFT.json");

async function checkPropertyNFT() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545"
  );
  const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

  const propertyNFT = new ethers.Contract(
    process.env.PROPERTY_NFT_CONTRACT_ADDRESS,
    PropertyNFTABI.abi,
    wallet
  );

  try {
    // Check contract owner
    const owner = await propertyNFT.owner();
    console.log(`Contract owner: ${owner}`);

    // Check contract name and symbol
    const name = await propertyNFT.name();
    const symbol = await propertyNFT.symbol();
    console.log(`Contract name: ${name}, Symbol: ${symbol}`);

    // Try to get balance of the owner (should work even if no tokens exist)
    const balance = await propertyNFT.balanceOf(owner);
    console.log(`Owner's token balance: ${balance.toString()}`);

    // If there are tokens, try to check them directly
    if (balance.gt(0)) {
      console.log("\nChecking tokens (this might take a moment)...");
      // Try to find tokens by checking a range
      const MAX_TOKENS_TO_CHECK = 100;
      let tokensFound = 0;

      for (
        let tokenId = 1;
        tokenId <= MAX_TOKENS_TO_CHECK && tokensFound < balance;
        tokenId++
      ) {
        try {
          // Check if token exists by trying to get its owner
          const tokenOwner = await propertyNFT.ownerOf(tokenId);
          if (tokenOwner && tokenOwner !== ethers.constants.AddressZero) {
            console.log(`\nToken ID: ${tokenId}`);
            console.log(`  Owner: ${tokenOwner}`);
            tokensFound++;

            // Try to get token URI if exists
            try {
              const tokenURI = await propertyNFT.tokenURI(tokenId);
              console.log(`  URI: ${tokenURI}`);
            } catch (e) {
              console.log("  No token URI");
            }

            // Try to get property details
            try {
              const prop = await propertyNFT.properties(tokenId);
              console.log(`  Title: ${prop.title}`);
              console.log(`  Location: ${prop.location}`);
              console.log(
                `  Price: ${ethers.utils.formatEther(prop.price)} ETH`
              );
              console.log(`  Size: ${prop.size} sq ft`);
              console.log(`  Total Shares: ${prop.totalShares}`);
              console.log(`  Is Listed: ${prop.isListed}`);
              console.log(`  Fractional Token: ${prop.fractionalToken}`);
            } catch (e) {
              console.log("  No property details available");
            }
          }
        } catch (e) {
          // Token doesn't exist, continue to next ID
          continue;
        }
      }
    } else {
      console.log("No tokens found in the contract");
    }
  } catch (error) {
    console.error("Error checking PropertyNFT contract:", error);
  }
}

checkPropertyNFT().catch(console.error);
