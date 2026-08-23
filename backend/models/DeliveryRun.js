const mongoose = require("mongoose");

const deliveryRunSchema = new mongoose.Schema(
  {
    runDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    vehicleNumber: {
      type: String,
      trim: true,
    },

    driverName: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "cancelled"],
      default: "planned",
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

module.exports = mongoose.model("DeliveryRun", deliveryRunSchema);