const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema(
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
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    distributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
    },

    items: {
      type: [purchaseOrderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Purchase order must contain at least one item",
      },
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["pending", "partial", "completed", "cancelled"],
      default: "pending",
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

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);