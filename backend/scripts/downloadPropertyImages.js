const fs = require("fs");
const path = require("path");
const https = require("https");
const properties = require("../../listings/properties.json");

// Directory to save property images
const assetsDir = path.join(__dirname, "..", "public", "assets", "properties");

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Function to download an image
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on("finish", () => {
            file.close(resolve);
          });
        } else {
          file.close();
          fs.unlink(filepath, () => {});
          reject(new Error(`Failed to download ${url}`));
        }
      })
      .on("error", (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
  });
};

// Process each property
const processProperties = async () => {
  const updatedProperties = [...properties];

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const propertyDir = path.join(assetsDir, `property_${i + 1}`);

    // Create property directory
    if (!fs.existsSync(propertyDir)) {
      fs.mkdirSync(propertyDir, { recursive: true });
    }

    // Process each image
    const updatedImages = [];
    for (let j = 0; j < property.images.length; j++) {
      const image = property.images[j];
      const ext = path.extname(new URL(image.url).pathname) || ".jpg";
      const filename = `image_${j + 1}${ext}`;
      const filepath = path.join(propertyDir, filename);
      const webPath = `/assets/properties/property_${i + 1}/${filename}`;

      try {
        await downloadImage(image.url, filepath);
        updatedImages.push({
          url: webPath,
          isMain: image.isMain,
        });
        console.log(`Downloaded: ${webPath}`);
      } catch (error) {
        console.error(`Error downloading ${image.url}:`, error.message);
        // Keep the original URL if download fails
        updatedImages.push(image);
      }
    }

    updatedProperties[i].images = updatedImages;
  }

  // Save updated properties
  fs.writeFileSync(
    path.join(__dirname, "..", "listings", "properties_updated.json"),
    JSON.stringify(updatedProperties, null, 2)
  );

  console.log(
    "Processing complete. Updated properties saved to properties_updated.json"
  );
};

processProperties().catch(console.error);
