const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const Property = require("../models/Property");
const User = require("../models/User");
const mongoose = require("mongoose");

// Middleware to validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (id === "new") {
    return next(); // Allow 'new' for create operations
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid property ID format",
    });
  }
  next();
};

// @route   GET api/properties
// @desc    Get all properties
// @access  Public
router.get("/", async (req, res) => {
  try {
    const properties = await Property.find()
      .populate("lister", "name email")
      .select("+fractionalToken");
    res.json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// @route   GET api/properties/:id
// @desc    Get single property
// @access  Public
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    if (req.params.id === "new") {
      return res.status(200).json({
        success: true,
        isNew: true,
        data: {
          title: "",
          description: "",
          price: 0,
          totalShares: 1000,
          sharePrice: 0,
          address: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          images: [],
        },
      });
    }

    const property = await Property.findById(req.params.id)
      .populate("lister", "name email")
      .select("+fractionalToken");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    res.json({
      success: true,
      data: property.toObject(),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// @route   POST api/properties
// @desc    Create a property listing
// @access  Private
router.post(
  "/",
  [
    auth.protect,
    [
      check("title", "Title is required").not().isEmpty(),
      check("description", "Description is required").not().isEmpty(),
      check("price", "Price is required and must be a positive number").isFloat(
        { min: 0 }
      ),
      check("totalShares", "Total shares must be at least 1").isInt({ min: 1 }),
      check("sharePrice", "Share price must be greater than 0").isFloat({
        min: 0.0001,
      }),
      check("address.street", "Street address is required").not().isEmpty(),
      check("address.city", "City is required").not().isEmpty(),
      check("address.state", "State is required").not().isEmpty(),
      check("address.zipCode", "ZIP code is required").not().isEmpty(),
      check("address.country", "Country is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Create new property with lister set to current user
      const propertyData = {
        ...req.body,
        lister: req.user.id,
        availableShares: req.body.totalShares,
        isListed: true,
      };

      const property = new Property(propertyData);
      await property.save();

      // Add the lister as the initial owner
      await property.updateOwnership(
        req.user.id,
        property.totalShares,
        "initial-creation-" + property._id
      );

      res.status(201).json(property);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   PUT api/properties/:id
// @desc    Update a property
// @access  Private
router.put("/:id", [auth.protect], async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ msg: "Property not found" });
    }

    // Check if user is the lister
    if (property.lister.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    // Prevent changing certain fields after creation
    const { totalShares, sharePrice, lister, ...updateData } = req.body;

    // Only update allowed fields
    property = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json(property);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Property not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   GET api/properties/me/listed
// @desc    Get properties listed by current user
// @access  Private
router.get("/me/listed", auth.protect, async (req, res) => {
  try {
    const properties = await Property.find({ lister: req.user.id });
    res.json(properties);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/properties/me/owned
// @desc    Get properties where current user owns shares
// @access  Private
router.get("/me/owned", auth.protect, async (req, res) => {
  try {
    const properties = await Property.find({
      "currentOwners.user": req.user.id,
    });

    // Add ownership details to each property
    const propertiesWithOwnership = properties.map((property) => {
      const ownerData = property.currentOwners.find(
        (owner) => owner.user.toString() === req.user.id
      );

      return {
        ...property.toObject(),
        userShares: ownerData.shares,
        ownershipPercentage: (ownerData.shares / property.totalShares) * 100,
      };
    });

    res.json(propertiesWithOwnership);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/properties/:id
// @desc    Delete a property
// @access  Private
router.delete("/:id", auth.protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ msg: "Property not found" });
    }

    // Check if user is the lister
    if (property.lister.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    // Check if there are other owners
    const hasOtherOwners = property.currentOwners.some(
      (owner) => owner.user.toString() !== req.user.id
    );

    if (hasOtherOwners) {
      return res.status(400).json({
        msg: "Cannot delete property with other shareholders",
      });
    }

    await property.remove();
    res.json({ msg: "Property removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Property not found" });
    }
    res.status(500).send("Server Error");
  }
});

module.exports = router;
