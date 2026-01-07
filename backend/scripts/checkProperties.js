const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Property = require("../models/Property");
const User = require("../models/User");

// Load environment variables
dotenv.config({ path: "../.env" });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

async function checkAndFixProperties() {
  try {
    // Find all properties that either don't have an owner or have a null owner
    const properties = await Property.find({
      $or: [
        { owner: { $exists: false } },
        { owner: null },
        { owner: { $in: [null, undefined] } },
      ],
    });

    console.log(`Found ${properties.length} properties without an owner`);

    if (properties.length === 0) {
      console.log("No properties without owners found.");
      process.exit(0);
    }

    console.log("\nProperties without owners:");
    console.log("----------------------");

    // Get the first admin user to assign as owner if needed
    const adminUser = await User.findOne({ role: "admin" });

    if (!adminUser) {
      console.error("No admin user found to assign as owner");
      process.exit(1);
    }

    // Process each property
    for (const property of properties) {
      console.log(`\nProperty ID: ${property._id}`);
      console.log(`Title: ${property.title}`);
      console.log(`Current owner: ${property.owner || "None"}`);

      // Ask user what to do
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        readline.question(
          `Assign admin (${adminUser._id}) as owner? (y/n/delete): `,
          resolve
        );
      });
      readline.close();

      if (answer.toLowerCase() === "y") {
        // Assign admin as owner
        property.owner = adminUser._id;
        await property.save();
        console.log(`Assigned admin as owner for property ${property._id}`);
      } else if (answer.toLowerCase() === "delete") {
        // Delete the property
        await Property.findByIdAndDelete(property._id);
        console.log(`Deleted property ${property._id}`);
      } else {
        console.log(`Skipped property ${property._id}`);
      }
    }

    console.log("\nFinished processing properties");
    process.exit(0);
  } catch (error) {
    console.error("Error checking properties:", error);
    process.exit(1);
  }
}

// Run the function
checkAndFixProperties();
