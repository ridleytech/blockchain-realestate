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

      // Get the contract instance
      const contract = getContract("FractionalToken", property.fractionalToken);

      // Log contract details for debugging
      console.log("Contract address:", property.fractionalToken);
      console.log("Contract methods:", Object.keys(contract.methods));

      // Set default values in case contract calls fail
      let name = "FractionalToken";
      let symbol = "FT";
      let totalSupply = "0";
      let isTradable = false;
      let contractPricePerShare =
        property.pricePerShare?.toString() || "1000000000000000000"; // Use property price or default to 1 ETH

      try {
        // Try to get contract state, but don't fail if it doesn't work
        try {
          name = (await contract.methods.name().call()) || name;
        } catch (err) {
          console.warn("Could not get token name, using default:", err.message);
        }

        try {
          symbol = (await contract.methods.symbol().call()) || symbol;
        } catch (err) {
          console.warn(
            "Could not get token symbol, using default:",
            err.message
          );
        }

        try {
          const supply = await contract.methods.totalSupply().call();
          if (supply) totalSupply = supply.toString();
        } catch (err) {
          console.warn(
            "Could not get total supply, using default:",
            err.message
          );
        }

        try {
          isTradable = await contract.methods.isTradable().call();
        } catch (err) {
          console.warn(
            "Could not get isTradable, assuming false:",
            err.message
          );
        }

        try {
          const price = await contract.methods.pricePerShare().call();
          if (price) contractPricePerShare = price.toString();
        } catch (err) {
          console.warn(
            "Could not get price per share, using default:",
            err.message
          );
        }

        console.log("Contract state:", {
          name,
          symbol,
          totalSupply,
          isTradable,
          pricePerShare: contractPricePerShare,
        });

        // Check if trading is enabled
        if (!isTradable) {
          return res.status(400).json({
            success: false,
            message: "Trading is not enabled for this token",
          });
        }

        // Calculate expected value based on actual shares being purchased
        const pricePerShare = contractPricePerShare;
        const expectedValue = BigInt(pricePerShare) * BigInt(shares);
        const transactionValue = BigInt(tx.value);

        console.log("Purchase details:", {
          shares,
          pricePerShare: pricePerShare.toString(),
          expectedValue: expectedValue.toString(),
          transactionValue: transactionValue.toString(),
        });

        // Verify the transaction value is sufficient
        if (transactionValue < expectedValue) {
          return res.status(400).json({
            success: false,
            message: "Insufficient payment",
            required: expectedValue.toString(),
            provided: transactionValue.toString(),
          });
        }

        // Check if enough shares are available
        const availableShares = BigInt(property.availableShares);
        if (BigInt(shares) > availableShares) {
          return res.status(400).json({
            success: false,
            message: `Only ${availableShares} shares available`,
            available: availableShares.toString(),
            requested: shares.toString(),
          });
        }

        // Verify the transaction is from the buyer's wallet
        if (tx.from.toLowerCase() !== buyer.walletAddress.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: "Transaction sender does not match buyer",
          });
        }

        // Verify the transaction is for the correct contract
        if (tx.to.toLowerCase() !== property.fractionalToken.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: "Transaction is not for the correct token contract",
          });
        }

        // Update property ownership
        await property.updateOwnership(buyerId, shares, transactionHash);

        // Create transaction record
        const transaction = new Transaction({
          property: propertyId,
          buyer: buyerId,
          seller: property.lister?._id || null, // Original lister is the seller
          shares,
          amount: (shares * property.sharePrice).toString(),
          transactionHash,
          status: "completed",
        });

        await transaction.save();

        // Update available shares
        property.availableShares -= shares;
        if (property.availableShares <= 0) {
          property.isListed = false;
        }
        await property.save();

        return res.json({
          success: true,
          message: "Purchase successful",
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
            status: property.isListed ? "listed" : "sold_out",
          },
        });
      } catch (error) {
        console.error("Error processing purchase:", {
          error: error.message,
          stack: error.stack,
          propertyId,
          buyerId,
          transactionHash,
        });

        // Save failed transaction with proper error handling
        try {
          const failedTransaction = new Transaction({
            property: propertyId,
            buyer: buyerId,
            seller: property?.lister?._id || null,
            shares: parseInt(shares) || 0,
            amount: (parseInt(shares) || 0) * (property?.sharePrice || 0),
            transactionHash: transactionHash || "unknown",
            status: "failed",
            error: error.message,
            errorDetails: {
              name: error.name,
              message: error.message,
              stack:
                process.env.NODE_ENV === "development"
                  ? error.stack
                  : undefined,
            },
          });

          await failedTransaction.save();
          console.log(`Failed transaction logged: ${failedTransaction._id}`);
        } catch (saveError) {
          console.error("Failed to save failed transaction:", {
            error: saveError.message,
            originalError: error.message,
            propertyId,
            buyerId,
            transactionHash,
          });
        }

        // Prepare error response
        const statusCode = error.statusCode || 500;
        const errorResponse = {
          success: false,
          message: error.userMessage || "Error processing purchase",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "An error occurred",
          code: error.code || "PURCHASE_ERROR",
        };

        // Add validation error details if available
        if (error.name === "ValidationError") {
          errorResponse.errors = Object.values(error.errors || {}).map((e) => ({
            field: e.path,
            message: e.message,
          }));
        }

        return res.status(statusCode).json(errorResponse);
      }
    } catch (error) {
      console.error("Unexpected error in purchase route:", {
        error: error.message,
        stack: error.stack,
        propertyId,
        buyerId,
        transactionHash,
      });

      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
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
