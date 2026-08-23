const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerKg: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    returnType: {
      type: String,
      enum: ["from_shop", "to_distributor"],
      required: true,
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },

    distributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
    },

    items: {
      type: [returnItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Return must contain at least one item",
      },
    },

    returnDate: {
      type: Date,
      default: Date.now,
    },

    reason: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Return", returnSchema);