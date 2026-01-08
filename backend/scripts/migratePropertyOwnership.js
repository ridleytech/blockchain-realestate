const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Property = require("../models/Property");

// Load environment variables
dotenv.config({ path: "../../.env" });

async function migratePropertyOwnership() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");

    // Find all properties with the old owner field
    const properties = await Property.find({
      $or: [
        { owner: { $exists: true } },
        { $where: "this.owners && this.owners.length > 0" },
      ],
    });

    console.log(`Found ${properties.length} properties to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const property of properties) {
      try {
        // Skip if already migrated
        if (property.lister || property.currentOwners?.length > 0) {
          console.log(`Skipping already migrated property: ${property._id}`);
          skippedCount++;
          continue;
        }

        // Migrate owner to lister and currentOwners
        if (property.owner) {
          // Add current owner to currentOwners if not exists
          const hasExistingOwner = property.owners?.some(
            (owner) => owner.user.toString() === property.owner.toString()
          );

          if (!hasExistingOwner && property.owner) {
            property.currentOwners = [
              {
                user: property.owner,
                shares: property.totalShares - (property.availableShares || 0),
                purchaseDate: property.createdAt || new Date(),
                transactionHash: "migration-" + new Date().toISOString(),
              },
            ];
          } else if (property.owners?.length > 0) {
            // Migrate existing owners to currentOwners
            property.currentOwners = property.owners.map((owner) => ({
              user: owner.user,
              shares: owner.shares,
              purchaseDate:
                owner.purchaseDate || property.createdAt || new Date(),
              transactionHash:
                owner.transactionHash ||
                "migration-" + new Date().toISOString(),
            }));
          }

          // Set lister to the original owner
          property.lister = property.owner;

          // Mark as listed if there are available shares
          if (property.availableShares > 0) {
            property.isListed = true;
          }

          // Save the updated property
          await property.save();
          console.log(`Migrated property: ${property._id}`);
          migratedCount++;
        }
      } catch (err) {
        console.error(`Error migrating property ${property._id}:`, err);
        errorCount++;
      }
    }

    console.log("\nMigration Summary:");
    console.log("-----------------");
    console.log(`Total properties processed: ${properties.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Skipped (already migrated): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

// Run the migration
migratePropertyOwnership();
