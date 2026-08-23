const mongoose = require("mongoose");

const deliveryItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantityDelivered: {
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

const deliverySchema = new mongoose.Schema(
  {
    shopOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopOrder",
      required: true,
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    items: {
      type: [deliveryItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Delivery must contain at least one item",
      },
    },

    deliveredAt: {
      type: Date,
      default: Date.now,
    },

    deliveryRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryRun",
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

module.exports = mongoose.model("Delivery", deliverySchema);