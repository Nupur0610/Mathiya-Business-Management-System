const mongoose = require("mongoose");

const dailyBalanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },

    openingCash: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    openingGPay: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    expectedCash: {
      type: Number,
      required: true,
      default: 0,
    },
    
    expectedGPay: {
      type: Number,
      required: true,
      default: 0,
    },

    actualCash: {
      type: Number,
      min: 0,
    },

    actualGPay: {
      type: Number,
      min: 0,
    },

    cashDifference: {
      type: Number,
      default: 0,
    },

    gpayDifference: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model("DailyBalance", dailyBalanceSchema);