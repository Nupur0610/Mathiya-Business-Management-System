const mongoose = require("mongoose");

const stockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "PURCHASE_RECEIPT",
        "DELIVERY",
        "SALES_RETURN",
        "PURCHASE_RETURN",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
      ],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    referenceType: {
      type: String,
      enum: [
        "PurchaseReceipt",
        "Delivery",
        "Return",
        "StockAdjustment",
        "OpeningBalance",
      ],
      required: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    transactionDate: {
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

module.exports = mongoose.model(
  "StockTransaction",
  stockTransactionSchema
);