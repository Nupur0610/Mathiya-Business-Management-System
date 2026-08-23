const mongoose = require("mongoose");

const stockAdjustmentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },

    type: {
      type: String,
      enum: ["increase", "decrease"],
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    adjustmentDate: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.model("StockAdjustment", stockAdjustmentSchema);