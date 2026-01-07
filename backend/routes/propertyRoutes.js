const express = require("express");
const router = express.Router();
const Property = require("../models/Property");

// @route   GET api/properties
// @desc    Get all properties
// @access  Public
router.get("/", async (req, res) => {
  try {
    const properties = await Property.find()
      .populate("owner", "name email")
      .select("+fractionalToken");
    res.json(properties);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/properties/:id
// @desc    Get single property
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("owner", "name email")
      .select("+fractionalToken");

    if (!property) {
      return res.status(404).json({ msg: "Property not found" });
    }

    // Ensure fractionalToken is included in the response
    const propertyData = property.toObject();
    if (!propertyData.fractionalToken) {
      console.warn(`No fractionalToken found for property ${property._id}`);
    }

    res.json(propertyData);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Property not found" });
    }
    res.status(500).send("Server Error");
  }
});

module.exports = router;
