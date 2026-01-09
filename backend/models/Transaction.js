const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shares: {
      type: Number,
      required: true,
      min: [1, "Must purchase at least 1 share"],
    },
    amount: {
      type: String, // Storing as string to handle large numbers accurately
      required: true,
      validate: {
        validator: function (v) {
          return /^\d+$/.test(v); // Ensure it's a string of digits
        },
        message: (props) => `${props.value} is not a valid amount in wei`,
      },
    },
    amountUsd: {
      type: Number,
      required: true,
      min: [0, "USD amount must be positive"],
    },
    transactionHash: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Indexes for faster querying
transactionSchema.index({ property: 1 });
transactionSchema.index({ buyer: 1 });
transactionSchema.index({ seller: 1 });
transactionSchema.index({ status: 1 });

// Static method to get transactions by user
// transactionSchema.statics.findByUser = async function (userId) {
//   return this.find({
//     $or: [{ buyer: userId }, { seller: userId }],
//   })
//     .populate("property", "title price")
//     .populate("buyer", "name email")
//     .populate("seller", "name email")
//     .sort("-createdAt");
// };

// Static method to get transactions by property
transactionSchema.statics.findByProperty = async function (propertyId) {
  return this.find({ property: propertyId })
    .populate("buyer", "name email walletAddress")
    .populate("seller", "name email walletAddress")
    .sort("-createdAt");
};

module.exports = mongoose.model("Transaction", transactionSchema);
