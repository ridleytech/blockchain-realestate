const mongoose = require("mongoose");
const Property = require("../models/Property");
require("dotenv").config();

// Contract addresses from deployment
const CONFIG = {
  propertyNFT: "0x30fc2B1cB86065Ad916122211e85bf3e44559AB6",
  fractionalTokenFactory: "0x85a013d3A43f1E4429C30d0a631d844b847B0A75",
  properties: [
    {
      title: "Beautiful Family Home in Kingwood",
      tokenAddress: "0x8AfB053B3E4A3486d9A57060F46Fff586351FA79",
      tokenId: 1,
    },
    {
      title: "Modern Home in Humble",
      tokenAddress: "0x7a68596aD0BD9C0246C8E04f7c1b44C1337E01d9",
      tokenId: 2,
    },
    {
      title: "Luxury Home in Gated Community",
      tokenAddress: "0xa82a2989535b35637c70200F0e773c5bE7d69d34",
      tokenId: 3,
    },
    {
      title: "Waterfront Property in Kingwood",
      tokenAddress: "0x478E672d35a3CFE2f7B936088323b68dF369AF02",
      tokenId: 4,
    },
    {
      title: "Spacious Family Home in Porter",
      tokenAddress: "0x6cE845469311ebdA1377FE73F25e15b5ef109F1c",
      tokenId: 5,
    },
    {
      title: "Elegant Home in Riverwood",
      tokenAddress: "0xd69094D88E7A9d1cf0941e2647980233C9A29e26",
      tokenId: 6,
    },
  ],
};

async function updateProperties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/blockchain-real-estate",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("Connected to MongoDB");

    // Update all properties with the contract address
    const updateResult = await Property.updateMany(
      {},
      {
        $set: {
          contractAddress: CONFIG.propertyNFT,
          updatedAt: new Date(),
        },
      }
    );

    console.log(
      `Updated contract address for ${updateResult.nModified} properties`
    );

    // Update each property with its specific token address and ID
    for (const prop of CONFIG.properties) {
      const result = await Property.updateOne(
        { title: prop.title },
        {
          $set: {
            fractionalToken: prop.tokenAddress,
            tokenId: prop.tokenId,
            updatedAt: new Date(),
          },
        }
      );

      if (result.nModified === 0) {
        console.warn(`⚠️  No property found with title: ${prop.title}`);
      } else {
        console.log(
          `✅ Updated ${prop.title} with token address: ${prop.tokenAddress}`
        );
      }
    }

    console.log("\n✅ All properties updated successfully!");

    // Verify the updates
    console.log("\nVerifying updates...");
    const properties = await Property.find(
      {},
      "title contractAddress fractionalToken tokenId"
    ).lean();
    console.table(
      properties.map((p) => ({
        title: p.title,
        contractAddress: p.contractAddress ? "✅" : "❌",
        fractionalToken: p.fractionalToken ? "✅" : "❌",
        tokenId: p.tokenId || "❌",
      }))
    );
  } catch (error) {
    console.error("❌ Error updating properties:", error.message);
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the script
updateProperties();
