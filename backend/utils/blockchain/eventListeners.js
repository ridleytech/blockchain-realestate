const Property = require("../../models/Property");
const { ethers } = require("ethers");
const propertyNFTABI = require("../../../build/contracts/PropertyNFT.json");

// Initialize provider (replace with your provider URL)
const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_PROVIDER_URL || "http://localhost:7545"
);

// Initialize contract
let propertyNFT;

const initializeEventListeners = async (contractAddress) => {
  try {
    // Initialize contract instance
    propertyNFT = new ethers.Contract(
      contractAddress,
      propertyNFTABI.abi,
      provider
    );

    console.log(
      "Initializing event listeners for PropertyNFT at:",
      contractAddress
    );

    // Listen for PropertyMinted events
    propertyNFT.on(
      "PropertyMinted",
      async (tokenId, title, owner, tokenUri, event) => {
        try {
          console.log(
            `New property minted - Token ID: ${tokenId}, Owner: ${owner}`
          );

          // Update the property in the database with tokenId and other details
          await Property.findOneAndUpdate(
            { contractAddress: contractAddress.toLowerCase() },
            {
              tokenId: tokenId.toNumber(),
              owner: owner,
              isListed: false,
            },
            { new: true }
          );
        } catch (error) {
          console.error("Error handling PropertyMinted event:", error);
        }
      }
    );

    // Listen for PropertyListed events
    propertyNFT.on(
      "PropertyListed",
      async (tokenId, price, totalShares, event) => {
        try {
          console.log(
            `Property listed - Token ID: ${tokenId}, Price: ${price}, Shares: ${totalShares}`
          );

          const property = await Property.findOne({
            contractAddress: contractAddress.toLowerCase(),
            tokenId: tokenId.toNumber(),
          });

          if (property) {
            // Update the property with listing details
            property.price = ethers.utils.formatEther(price);
            property.totalShares = totalShares.toNumber();
            property.availableShares = totalShares.toNumber();
            property.isListed = true;
            await property.save();
          }
        } catch (error) {
          console.error("Error handling PropertyListed event:", error);
        }
      }
    );

    // Listen for PropertyUnlisted events
    propertyNFT.on("PropertyUnlisted", async (tokenId, event) => {
      try {
        console.log(`Property unlisted - Token ID: ${tokenId}`);

        await Property.findOneAndUpdate(
          {
            contractAddress: contractAddress.toLowerCase(),
            tokenId: tokenId.toNumber(),
          },
          { isListed: false },
          { new: true }
        );
      } catch (error) {
        console.error("Error handling PropertyUnlisted event:", error);
      }
    });

    console.log("Event listeners initialized successfully");
  } catch (error) {
    console.error("Error initializing event listeners:", error);
  }
};

module.exports = {
  initializeEventListeners,
};
