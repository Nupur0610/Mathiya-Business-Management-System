const mongoose = require("mongoose");

const purchasePriceSchema = new mongoose.Schema(
  {
    distributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

purchasePriceSchema.index(
  { distributor: 1, product: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "PurchasePrice",
  purchasePriceSchema
);