// Base URL for API requests
const API_BASE_URL = "http://localhost:4000";

// Default placeholder image (base64 encoded SVG)
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=";

/**
 * Get the correct image URL based on the environment and image path
 * @param {string|object} image - The image path or object containing the image path
 * @returns {string} The full image URL
 */
export const getImageUrl = (image) => {
  // If no image is provided, return placeholder
  if (!image) return PLACEHOLDER_IMAGE;

  let imagePath = "";

  // Handle different image formats
  if (typeof image === "object" && image.url) {
    // Handle object with url property
    imagePath = image.url;
  } else if (typeof image === "string") {
    // Handle direct string path
    imagePath = image;
  } else {
    return PLACEHOLDER_IMAGE;
  }

  // If it's already a full URL, return as is
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // Remove leading slash if present
  if (imagePath.startsWith("/")) {
    imagePath = imagePath.substring(1);
  }

  // Construct the full URL
  return `${API_BASE_URL}/images/${imagePath}`;
};

/**
 * Get the first available image from an array of images
 * @param {Array} images - Array of images
 * @returns {string} The URL of the first available image or a placeholder
 */
export const getFirstImage = (images) => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return PLACEHOLDER_IMAGE;
  }

  // Try to find the main image first
  const mainImage = images.find((img) => img.isMain);
  if (mainImage) {
    return getImageUrl(mainImage);
  }

  // Otherwise return the first image
  return getImageUrl(images[0]);
};

/**
 * Get all image URLs from an array of images
 * @param {Array} images - Array of images
 * @returns {Array} Array of image URLs
 */
export const getAllImageUrls = (images) => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [PLACEHOLDER_IMAGE];
  }
  return images.map((img) => getImageUrl(img));
};
