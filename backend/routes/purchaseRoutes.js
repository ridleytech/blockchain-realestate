const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const Property = require("../models/Property");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { web3, getContract } = require("../config/blockchain");

// @route   POST api/purchase
// @desc    Purchase property shares
// @access  Private
router.post(
  "/",
  [
    auth.protect,
    [
      check("propertyId", "Property ID is required").not().isEmpty(),
      check("shares", "Number of shares is required").isInt({ min: 1 }),
      check("transactionHash", "Transaction hash is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { propertyId, shares, transactionHash } = req.body;
    const buyerId = req.user.id;

    try {
      // Get property with owner populated
      const property = await Property.findById(propertyId).populate(
        "owner",
        "walletAddress"
      );

      if (!property) {
        return res.status(404).json({ msg: "Property not found" });
      }

      // Check if buyer is the owner
      if (buyerId === property.owner._id.toString()) {
        return res.status(400).json({ msg: "Cannot buy your own property" });
      }

      // Check if enough shares are available
      if (shares > property.availableShares) {
        return res.status(400).json({
          msg: `Only ${property.availableShares} shares available`,
        });
      }

      // Get buyer's wallet address
      const buyer = await User.findById(buyerId).select("walletAddress");
      if (!buyer) {
        return res.status(404).json({ msg: "Buyer not found" });
      }

      // Verify the transaction on the blockchain
      const tx = await web3.eth.getTransaction(transactionHash);
      if (!tx) {
        return res.status(400).json({ msg: "Invalid transaction hash" });
      }

      // Get the contract instance
      const contract = getContract(property.fractionalToken);

      // Verify the transaction is for the correct contract and function
      if (tx.to.toLowerCase() !== property.fractionalToken.toLowerCase()) {
        return res.status(400).json({ msg: "Invalid token contract" });
      }

      // Verify the transaction is from the buyer's wallet
      if (tx.from.toLowerCase() !== buyer.walletAddress.toLowerCase()) {
        return res
          .status(400)
          .json({ msg: "Transaction sender does not match buyer" });
      }

      // Verify the transaction is to the purchase function
      const functionSignature = tx.input.substring(0, 10);
      const purchaseFunctionSignature = web3.eth.abi.encodeFunctionSignature(
        "purchaseShares(uint256,uint256)"
      );

      if (functionSignature !== purchaseFunctionSignature) {
        return res.status(400).json({ msg: "Invalid transaction function" });
      }

      // Create transaction record
      const transaction = new Transaction({
        property: propertyId,
        buyer: buyerId,
        seller: property.owner._id,
        shares,
        amount: shares * property.sharePrice,
        transactionHash,
        status: "completed",
      });

      await transaction.save();

      // Update property's available shares
      property.availableShares -= shares;

      // If no shares left, mark as sold
      if (property.availableShares === 0) {
        property.status = "sold";
      }

      await property.save();

      res.json({
        msg: "Purchase successful",
        transaction: {
          id: transaction._id,
          shares,
          amount: transaction.amount,
          transactionHash,
          timestamp: transaction.createdAt,
        },
        property: {
          id: property._id,
          availableShares: property.availableShares,
          status: property.status,
        },
      });
    } catch (err) {
      console.error(err.message);

      // Save failed transaction if we have enough info
      if (propertyId && buyerId) {
        try {
          const failedTx = new Transaction({
            property: propertyId,
            buyer: buyerId,
            seller: property?.owner?._id,
            shares: shares || 0,
            amount: (shares || 0) * (property?.sharePrice || 0),
            transactionHash: transactionHash || "unknown",
            status: "failed",
            error: err.message,
          });
          await failedTx.save();
        } catch (saveErr) {
          console.error("Failed to save failed transaction:", saveErr);
        }
      }

      res.status(500).send("Server error");
    }
  }
);

// @route   GET api/purchase/property/:propertyId
// @desc    Get all transactions for a property
// @access  Public
router.get("/property/:propertyId", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      property: req.params.propertyId,
    })
      .populate("buyer", "name email walletAddress")
      .populate("seller", "name email walletAddress")
      .sort("-createdAt");

    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/purchase/user
// @desc    Get all transactions for the current user
// @access  Private
router.get("/user", auth.protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ buyer: req.user.id }, { seller: req.user.id }],
    })
      .populate({
        path: "property",
        select: "title price sharePrice images",
      })
      .populate("buyer", "name email walletAddress")
      .populate("seller", "name email walletAddress")
      .sort("-createdAt");

    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
