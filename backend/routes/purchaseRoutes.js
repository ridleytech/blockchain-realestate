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
      check("shares", "Number of shares is required")
        .isNumeric()
        .toInt()
        .isInt({ min: 1 })
        .withMessage("Shares must be a positive integer"),
      check("transactionHash", "Transaction hash is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const requestId = Date.now();
    console.log(`[${requestId}] Purchase request received:`, {
      timestamp: new Date().toISOString(),
      body: req.body,
      user: req.user ? { id: req.user.id, email: req.user.email } : "No user",
      headers: {
        "content-type": req.headers["content-type"],
        authorization: req.headers["authorization"]
          ? "Bearer [REDACTED]"
          : "None",
        "user-agent": req.headers["user-agent"],
      },
      url: req.originalUrl,
      method: req.method,
    });

    // Log raw body for debugging
    console.log(`[${requestId}] Raw request body:`, req.body);

    // Enhanced validation with detailed error messages
    const errors = validationResult(req);
    console.log(`[${requestId}] Validation results:`, {
      hasErrors: !errors.isEmpty(),
      errors: errors.array(),
    });

    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map((err) => ({
        param: err.param,
        value: err.value,
        msg: err.msg,
      }));

      console.error("Validation failed with errors:", {
        errors: errorDetails,
        requestBody: req.body,
      });

      const response = {
        success: false,
        message: "Validation error",
        errors: errorDetails,
        requestId: requestId,
        timestamp: new Date().toISOString(),
      };

      console.log(`[${requestId}] Sending 400 response:`, response);
      return res.status(400).json(response);
    }

    const { propertyId, shares, transactionHash } = req.body;
    const buyerId = req.user.id;

    // Log the incoming request details
    console.log(`[${requestId}] Processing purchase:`, {
      propertyId,
      shares,
      transactionHash: transactionHash
        ? `${transactionHash.substring(0, 10)}...`
        : "None",
      buyerId,
    });

    try {
      // Get property with lister populated
      console.log(`[${requestId}] Looking up property:`, { propertyId });
      const property = await Property.findById(propertyId).populate(
        "lister",
        "walletAddress"
      );

      console.log(`[${requestId}] Property lookup result:`, {
        found: !!property,
        propertyId: property?._id,
        isListed: property?.isListed,
        availableShares: property?.availableShares,
        listerId: property?.lister?._id,
        listerWallet: property?.lister?.walletAddress
          ? `${property.lister.walletAddress.substring(0, 10)}...`
          : "None",
      });

      if (!property) {
        console.error(`[${requestId}] Property not found:`, { propertyId });
        return res.status(404).json({
          success: false,
          message: "Property not found",
          propertyId,
          requestId,
        });
      }

      // Check if property is listed for sale
      if (!property.isListed) {
        return res.status(400).json({ msg: "Property is not listed for sale" });
      }

      // Check if buyer is the lister (only if lister exists)
      if (property.lister && buyerId === property.lister._id.toString()) {
        return res
          .status(400)
          .json({ msg: "Cannot buy shares of your own property" });
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

      console.log("Transaction details:", {
        txTo: tx.to,
        propertyToken: property.fractionalToken,
        txFrom: tx.from,
        buyerWallet: buyer.walletAddress,
        txInput: tx.input.substring(0, 100) + "...", // First 100 chars of input data
        txValue: tx.value,
        txGas: tx.gas,
        txGasPrice: tx.gasPrice,
      });

      // Verify the function signature - using buyShares instead of purchaseShares
      const buyFunctionSignature =
        web3.eth.abi.encodeFunctionSignature("buyShares(uint256)");
      console.log("Expected function signature:", buyFunctionSignature);
      console.log("Actual function signature:", tx.input.substring(0, 10));

      if (tx.input.substring(0, 10) !== buyFunctionSignature) {
        console.error("Invalid function signature in transaction");
        return res.status(400).json({
          msg: "Invalid transaction function",
          expected: buyFunctionSignature,
          actual: tx.input.substring(0, 10),
        });
      }

      // Get the contract instance - use the contract name instead of address
      const contract = getContract("FractionalToken", property.fractionalToken);

      // Log contract details for debugging
      console.log("Contract address:", property.fractionalToken);
      console.log("Contract methods:", Object.keys(contract.methods));

      // Log additional contract state
      // Add this after getting the contract instance
      try {
        const totalSupply = await contract.methods.totalSupply().call();
        const symbol = await contract.methods.symbol().call();
        const name = await contract.methods.name().call();
        const isTradable = await contract.methods.isTradable().call();

        console.log("Contract state:", {
          name,
          symbol,
          totalSupply,
          isTradable,
        });
      } catch (err) {
        console.error("Error getting contract state:", err);
      }

      // Get price per share from the contract with error handling
      let pricePerShare;
      try {
        pricePerShare = await contract.methods.pricePerShare().call();
        console.log("Price per share:", pricePerShare);
      } catch (err) {
        console.error("Error getting price per share:", err);
        // Default to a reasonable value if we can't get the price
        pricePerShare = "1000000000000000000"; // 1 ETH in wei as fallback
        console.log("Using default price per share:", pricePerShare);
      }

      console.log("Transaction value:", tx.value.toString());
      const expectedValue = BigInt(pricePerShare) * BigInt(1);
      console.log("Expected value for 1 share:", expectedValue.toString());

      // Verify the transaction value matches the price per share
      if (BigInt(tx.value) !== expectedValue) {
        return res.status(400).json({
          msg: "Incorrect transaction value",
          expected: expectedValue.toString(),
          actual: tx.value.toString(),
          note: "Expected value is based on price per share from contract or default fallback",
        });
      }

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

      // The function signature was already verified above

      // Update property ownership
      await property.updateOwnership(buyerId, shares, transactionHash);

      // Create transaction record
      const transaction = new Transaction({
        property: propertyId,
        buyer: buyerId,
        seller: property.lister._id, // Original lister is the seller
        shares,
        amount: shares * property.sharePrice,
        transactionHash,
        status: "completed",
      });

      await transaction.save();

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
      console.error("Purchase processing error:", {
        error: err.message,
        stack: err.stack,
        requestBody: req.body,
        userId: req.user?.id,
        propertyId: req.body.propertyId,
      });

      // Save failed transaction with proper error handling
      try {
        // Get fresh property data for the failed transaction
        const property = propertyId
          ? await Property.findById(propertyId)
              .select("owner sharePrice title")
              .lean()
          : null;

        if (property) {
          const failedTx = new Transaction({
            property: propertyId,
            buyer: buyerId,
            seller: property.owner?._id || null,
            shares: parseInt(shares) || 0,
            amount: (parseInt(shares) || 0) * (property.sharePrice || 0),
            transactionHash: transactionHash || "unknown",
            status: "failed",
            error: err.message,
            errorDetails: {
              name: err.name,
              message: err.message,
              stack:
                process.env.NODE_ENV === "development" ? err.stack : undefined,
            },
          });

          await failedTx.save();
          console.log(`Failed transaction logged: ${failedTx._id}`);
        } else {
          console.error(
            "Could not save failed transaction: Property not found",
            {
              propertyId,
              error: err.message,
            }
          );
        }
      } catch (saveErr) {
        console.error("Failed to save failed transaction:", {
          error: saveErr.message,
          originalError: err.message,
          propertyId,
          buyerId,
          transactionHash,
        });
      }

      // Provide more detailed error response
      const statusCode = err.statusCode || 500;
      const errorResponse = {
        success: false,
        message: err.userMessage || "Error processing purchase",
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "An error occurred",
        code: err.code || "PURCHASE_ERROR",
      };

      // Add validation error details if available
      if (err.name === "ValidationError") {
        errorResponse.errors = Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message,
        }));
      }

      return res.status(statusCode).json(errorResponse);
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
