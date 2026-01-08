// backend/scripts/updatePropertyAddresses.js
const mongoose = require("mongoose");
const Property = require("../models/Property");

// Token addresses from your Ganache deployment
const properties = [
  {
    title: "Beautiful Family Home in Kingwood",
    tokenAddress: "0xf7ad08Abb0eC9f65Cca25d1972C90f3b769FdeE1",
    tokenId: 1,
  },
  {
    title: "Modern Home in Humble",
    tokenAddress: "0x2b79aC5aaDc3ae70FAb8d841645F0Ff0a3eA81fC",
    tokenId: 2,
  },
  {
    title: "Luxury Home in Gated Community",
    tokenAddress: "0x513943acB5E43e58aD2E00EE301De961dcCBdBd1",
    tokenId: 3,
  },
  {
    title: "Waterfront Property in Kingwood",
    tokenAddress: "0x4bAc01E86b4964a8C7d4fd3C0Ca0cF9580bA864B",
    tokenId: 4,
  },
  {
    title: "Spacious Family Home in Porter",
    tokenAddress: "0x892679a93FA17B8443c60edd768E632aC8cDD899",
    tokenId: 5,
  },
  {
    title: "Elegant Home in Riverwood",
    tokenAddress: "0x5d019E4e0a0751E751DEa31f7B0D01f3A4bC2626",
    tokenId: 6,
  },
];

// The FractionalTokenFactory address from your .env
const FRACTIONAL_TOKEN_FACTORY_ADDRESS =
  "0xb2fb91BB78aCaD92ceDdc520e684B3a1f30E2752";

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

    // Update each property with its token address
    for (const prop of properties) {
      const updated = await Property.findOneAndUpdate(
        { tokenId: prop.tokenId },
        {
          fractionalToken: prop.tokenAddress,
          contractAddress: FRACTIONAL_TOKEN_FACTORY_ADDRESS, // Use the factory address here
        },
        { new: true }
      );

      if (updated) {
        console.log(`✅ Updated ${prop.title}`);
        console.log(`   - fractionalToken: ${prop.tokenAddress}`);
        console.log(
          `   - contractAddress: ${FRACTIONAL_TOKEN_FACTORY_ADDRESS}`
        );
      } else {
        console.log(`❌ Property with tokenId ${prop.tokenId} not found`);
      }
    }

    console.log("\n✅ All properties updated successfully!");

    // Verify updates
    console.log("\nVerifying updates...");
    const allProperties = await Property.find({}).sort("tokenId");
    const tableData = allProperties.map((prop) => ({
      title: prop.title,
      contractAddress: prop.contractAddress ? "✅" : "❌",
      fractionalToken: prop.fractionalToken ? "✅" : "❌",
      tokenId: prop.tokenId,
    }));
    console.table(tableData);
  } catch (error) {
    console.error("Error updating properties:", error);
  } finally {
    mongoose.connection.close();
  }
}

updateProperties();
