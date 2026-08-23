const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    partyType: {
      type: String,
      enum: ["shop", "distributor"],
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

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "gpay"],
      required: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    reference: {
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

module.exports = mongoose.model("Payment", paymentSchema);