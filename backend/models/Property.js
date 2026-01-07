const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    // Existing fields...
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
      min: [0, "Price must be a positive number"],
    },
    totalShares: {
      type: Number,
      required: [true, "Please specify total number of shares"],
      min: [1, "There must be at least 1 share"],
    },
    availableShares: {
      type: Number,
      default: function () {
        return this.totalShares;
      },
    },
    sharePrice: {
      type: Number,
      required: [true, "Please specify price per share"],
      min: [0.0001, "Share price must be greater than 0"],
    },
    images: [
      {
        url: String,
        isMain: { type: Boolean, default: false },
      },
    ],
    features: [
      {
        name: String,
        value: String,
        icon: String,
      },
    ],
    propertyType: {
      type: String,
      required: true,
      enum: [
        "Apartment",
        "House",
        "Villa",
        "Condo",
        "Townhouse",
        "Commercial",
        "Land",
        "Other",
      ],
    },
    size: {
      type: Number,
      required: [true, "Please add property size in square feet"],
    },
    bedrooms: {
      type: Number,
      required: [true, "Please specify number of bedrooms"],
    },
    bathrooms: {
      type: Number,
      required: [true, "Please specify number of bathrooms"],
    },
    yearBuilt: {
      type: Number,
      required: [true, "Please specify year built"],
    },
    // Blockchain related fields
    tokenId: {
      type: Number,
      default: null,
    },
    contractAddress: {
      type: String,
      default: null,
      match: [/^0x[a-fA-F0-9]{40}$/, "Please provide a valid contract address"],
    },
    fractionalToken: {
      type: String,
      default: null,
      match: [/^0x[a-fA-F0-9]{40}$/, "Please provide a valid token address"],
    },
    isListed: {
      type: Boolean,
      default: false,
    },
    // Additional metadata
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    // Ownership tracking
    owners: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        shares: {
          type: Number,
          required: true,
          min: [1, "Must have at least 1 share"],
        },
        purchaseDate: {
          type: Date,
          default: Date.now,
        },
        transactionHash: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
propertySchema.index({ price: 1 });
propertySchema.index({ "address.city": 1 });
propertySchema.index({ propertyType: 1 });
propertySchema.index({ isListed: 1 });

// Virtual for property URL
propertySchema.virtual("url").get(function () {
  return `/api/v1/properties/${this._id}`;
});

// Update the updatedAt field before saving
propertySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get properties by owner
propertySchema.statics.findByOwner = function (ownerId) {
  return this.find({ owner: ownerId });
};

// Static method to get available properties
propertySchema.statics.getAvailableProperties = async function () {
  return this.find({ availableShares: { $gt: 0 } });
};

// Method to check if a user owns any shares of this property
propertySchema.methods.getUserOwnership = function (userId) {
  const ownership = this.owners.find(
    (owner) => owner.user.toString() === userId.toString()
  );
  return ownership ? ownership.shares : 0;
};

// Method to add or update ownership
propertySchema.methods.updateOwnership = async function (
  userId,
  shares,
  transactionHash
) {
  const ownerIndex = this.owners.findIndex(
    (owner) => owner.user.toString() === userId.toString()
  );

  if (ownerIndex >= 0) {
    // Update existing ownership
    this.owners[ownerIndex].shares += shares;
    this.owners[ownerIndex].purchaseDate = new Date();
    this.owners[ownerIndex].transactionHash = transactionHash;
  } else {
    // Add new ownership
    this.owners.push({
      user: userId,
      shares,
      transactionHash,
      purchaseDate: new Date(),
    });
  }

  return this.save();
};

// Virtual for total shares owned (sum of all owners' shares)
propertySchema.virtual("ownedShares").get(function () {
  return this.owners.reduce((total, owner) => total + owner.shares, 0);
});

module.exports = mongoose.model("Property", propertySchema);
