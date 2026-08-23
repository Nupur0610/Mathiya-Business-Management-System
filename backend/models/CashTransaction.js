const mongoose = require("mongoose");

const cashTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["personal_withdrawal", "personal_contribution"],
      required: true,
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

module.exports = mongoose.model("CashTransaction", cashTransactionSchema);