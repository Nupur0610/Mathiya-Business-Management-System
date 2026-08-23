const mongoose = require("mongoose");

const openingBalanceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "cash",
        "gpay",
        "stock",
        "shop_receivable",
        "distributor_payable",
      ],
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

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    quantity: {
      type: Number,
      min: 0,
    },

    amount: {
      type: Number,
      min: 0,
    },

    asOfDate: {
      type: Date,
      required: true,
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

module.exports = mongoose.model("OpeningBalance", openingBalanceSchema);