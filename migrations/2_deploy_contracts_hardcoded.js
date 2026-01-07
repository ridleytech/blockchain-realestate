const PropertyNFT = artifacts.require("PropertyNFT");
const FractionalToken = artifacts.require("FractionalToken");
const FractionalTokenFactory = artifacts.require("FractionalTokenFactory");

// Hardcoded properties from listings
const PROPERTIES = [
  {
    title: "Beautiful Family Home in Kingwood",
    description:
      "Spacious 4-bedroom home with modern amenities, large backyard, and open floor plan. Perfect for families looking for comfort and style in a great neighborhood.",
    price: 485000,
    totalShares: 1000,
    sharePrice: 485,
    propertyType: "House",
    images: [
      {
        url: "https://photos.zillowstatic.com/fp/2e83e1f4d6a0f5f5f5f5f5f5f5f5f5-cc_ft_1536.jpg",
        isMain: true,
      },
    ],
  },
  {
    title: "Modern Home in Humble",
    description:
      "Stunning 3-bedroom home featuring a modern design, updated kitchen, and beautiful landscaping. Close to schools and shopping centers.",
    price: 325000,
    totalShares: 1000,
    sharePrice: 325,
    propertyType: "House",
    images: [
      {
        url: "https://photos.zillowstatic.com/fp/9i8h7g6f5e4d3c2b1a0z9y8x7w6v5u4t-cc_ft_1536.jpg",
        isMain: true,
      },
    ],
  },
  {
    title: "Luxury Home in Gated Community",
    description:
      "Elegant 5-bedroom home with high-end finishes, swimming pool, and spacious outdoor living area. Located in a prestigious gated community.",
    price: 675000,
    totalShares: 1500,
    sharePrice: 450,
    propertyType: "House",
    images: [
      {
        url: "https://photos.zillowstatic.com/fp/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6-cc_ft_1536.jpg",
        isMain: true,
      },
    ],
  },
  {
    title: "Waterfront Property in Kingwood",
    description:
      "Stunning waterfront property with private dock, large windows with water views, and modern amenities. Perfect for those who love water activities.",
    price: 789000,
    totalShares: 2000,
    sharePrice: 394.5,
    propertyType: "House",
    images: [
      {
        url: "https://photos.zillowstatic.com/fp/condo1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6-cc_ft_1536.jpg",
        isMain: true,
      },
    ],
  },
  {
    title: "Spacious Family Home in Porter",
    description:
      "Beautifully maintained 4-bedroom home with open floor plan, modern kitchen, and large backyard. Great for entertaining and family living.",
    price: 415000,
    totalShares: 1000,
    sharePrice: 415,
    propertyType: "House",
    images: [
      {
        url: "https://photos.zillowstatic.com/fp/suburb1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6-cc_ft_1536.jpg",
        isMain: true,
      },
    ],
  },
  {
    title: "Elegant Home in Riverwood",
    description:
      "Stunning 5-bedroom home with luxurious finishes, gourmet kitchen, and resort-style backyard with pool. Located in the prestigious Riverwood community.",
    price: 925000,
    totalShares: 2500,
    sharePrice: 370,
    propertyType: "House",
    images: [
      {
        url: "https://photos.zillowstatic.com/fp/beach1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6-cc_ft_1536.jpg",
        isMain: true,
      },
    ],
  },
];

module.exports = async function (deployer, network, accounts) {
  const [deployerAccount] = accounts;
  console.log("Deploying contracts with account:", deployerAccount);

  try {
    console.log("Using hardcoded properties for deployment");

    if (PROPERTIES.length === 0) {
      console.log("No properties found to tokenize");
      return;
    }

    const properties = PROPERTIES;
    // Deploy PropertyNFT contract
    console.log("Deploying PropertyNFT...");
    await deployer.deploy(PropertyNFT);
    const propertyNFT = await PropertyNFT.deployed();
    console.log("✅ PropertyNFT deployed at:", propertyNFT.address);

    // Deploy FractionalTokenFactory contract
    console.log("\nDeploying FractionalTokenFactory...");
    await deployer.deploy(FractionalTokenFactory);
    const factory = await FractionalTokenFactory.deployed();
    console.log("✅ FractionalTokenFactory deployed at:", factory.address);

    console.log("\nProcessing properties...");

    for (const property of properties) {
      console.log(`\nProcessing property: ${property.title}`);

      // Mint NFT for the property
      console.log(`  Minting NFT for property: ${property.title}...`);
      const mintResult = await propertyNFT.mintProperty(
        deployerAccount, // to
        property.title,
        property.address?.city || "Unknown", // location
        property.size || 1000, // size in sqft, default to 1000 if not provided
        property.images && property.images[0] ? property.images[0].url : "" // tokenURI
      );

      // Get token ID from transaction logs
      const tokenId = mintResult.logs[0].args.tokenId.toNumber();

      if (!tokenId) {
        console.error("❌ Failed to get token ID from mint transaction");
        continue;
      }

      console.log(`  ✅ Minted NFT with ID: ${tokenId}`);

      // Deploy FractionalToken for the property
      console.log("  Deploying FractionalToken...");
      const pricePerShareInWei = web3.utils.toWei(
        property.sharePrice.toString(),
        "ether"
      );

      const createResult = await factory.createFractionalToken(
        propertyNFT.address, // propertyNFTAddress
        tokenId, // propertyTokenId
        `${property.title} Share`, // name
        property.propertyType
          ? property.propertyType.substring(0, 4).toUpperCase()
          : "PROP", // symbol
        property.totalShares, // totalShares
        pricePerShareInWei // pricePerShare
      );

      // Get token address from transaction logs
      const tokenAddress = createResult.logs.find(
        (log) => log.event === "FractionalTokenCreated"
      )?.args.fractionalToken;

      if (!tokenAddress) {
        console.error(
          "❌ Failed to get token address from creation transaction. Logs:",
          JSON.stringify(createResult.logs, null, 2)
        );
        continue;
      }

      console.log(
        `  ✅ Created token for property: ${property.title} at ${tokenAddress}`
      );

      console.log(`  ✅ Deployed FractionalToken at: ${tokenAddress}`);

      console.log(`✅ Successfully processed property: ${property.title}`);
      console.log(`   - NFT ID: ${tokenId}`);
      console.log(`   - Token Address: ${tokenAddress}`);
      console.log(
        `   - Note: Trading is disabled by default. The property owner can enable it later.`
      );
    }

    console.log("\n✅ All properties processed successfully!");
  } catch (error) {
    console.error("❌ Error during deployment:", error);
    throw error;
  }
};
