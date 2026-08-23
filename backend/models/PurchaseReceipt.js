const mongoose = require("mongoose");

const purchaseReceiptItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantityReceived: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseReceiptSchema = new mongoose.Schema(
  {
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },

    distributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
    },

    items: {
      type: [purchaseReceiptItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Purchase receipt must contain at least one item",
      },
    },

    receivedAt: {
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

module.exports = mongoose.model("PurchaseReceipt", purchaseReceiptSchema);