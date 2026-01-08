const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Property = require("../models/Property");
const User = require("../models/User");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

async function fixPropertyOwners() {
  try {
    // Find properties without an owner or with null owner
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

    // Get admin user to assign as owner
    const adminUser = await User.findOne({ role: "admin" });

    if (!adminUser) {
      console.error("No admin user found to assign as owner");
      process.exit(1);
    }

    for (const property of properties) {
      console.log("\n---");
      console.log(`Property ID: ${property._id}`);
      console.log(`Title: ${property.title || "No title"}`);
      console.log(
        `Address: ${property.address?.street || "No address"}, ${
          property.address?.city || ""
        } ${property.address?.state || ""}`
      );
      console.log(
        `Total Shares: ${property.totalShares}, Available: ${property.availableShares}`
      );

      const answer = await new Promise((resolve) => {
        readline.question(
          `\nChoose action for property ${property._id}:\n` +
            `1. Assign admin (${adminUser._id}) as owner\n` +
            `2. Delete this property\n` +
            `3. Skip this property\n` +
            `Enter choice (1/2/3): `,
          resolve
        );
      });

      if (answer === "1") {
        // Assign admin as owner
        property.owner = adminUser._id;
        await property.save();
        console.log(`✅ Assigned admin as owner for property ${property._id}`);
      } else if (answer === "2") {
        // Delete the property
        await Property.findByIdAndDelete(property._id);
        console.log(`🗑️  Deleted property ${property._id}`);
      } else {
        console.log(`⏭️  Skipped property ${property._id}`);
      }
    }

    console.log("\n✅ Finished processing all properties");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing property owners:", error);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\nProcess terminated by user");
  readline.close();
  process.exit(0);
});

// Run the function
fixPropertyOwners();
