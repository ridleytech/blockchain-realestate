const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Import the Property model
const Property = require("../models/Property");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/blockchain-real-estate",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// Read and parse the properties JSON file
const importProperties = async () => {
  try {
    // Read the JSON file
    const data = fs.readFileSync(
      path.join(__dirname, "../../sample-listings/properties.json"),
      "utf8",
    );
    const properties = JSON.parse(data);

    // Clear existing properties (optional)
    await Property.deleteMany({});
    console.log("Cleared existing properties");

    // Add default owner (you might want to change this to a real user ID)
    const defaultOwner = "65b9d3a1c9e77b001f123456"; // Replace with a valid user ID from your database

    // Add owner and timestamps to each property
    const propertiesWithOwner = properties.map((property) => ({
      ...property,
      owner: defaultOwner,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert properties into the database
    const result = await Property.insertMany(propertiesWithOwner);
    console.log(`Successfully imported ${result.length} properties`);

    // Close the connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error importing properties:", error);
    process.exit(1);
  }
};

// Run the import
(async () => {
  await connectDB();
  await importProperties();
})();
