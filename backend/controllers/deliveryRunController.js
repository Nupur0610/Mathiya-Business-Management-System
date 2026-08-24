const DeliveryRun = require("../models/DeliveryRun");

// Create delivery run
const createDeliveryRun = async (req, res) => {
  try {
    const {
      runDate,
      vehicleNumber,
      driverName,
      status,
      notes,
    } = req.body;

    // Basic validation
    if (!runDate) {
      return res.status(400).json({
        message: "runDate is required.",
      });
    }

    if (
      status &&
      !["planned", "in_progress", "completed", "cancelled"].includes(status)
    ) {
      return res.status(400).json({
        message:
          "Status must be planned, in_progress, completed or cancelled.",
      });
    }

    const deliveryRun = await DeliveryRun.create({
      runDate,
      vehicleNumber,
      driverName,
      status,
      notes,
    });

    res.status(201).json({
      message: "Delivery run created successfully.",
      deliveryRun,
    });
  } catch (error) {
    console.error("Create delivery run error:", error);

    res.status(500).json({
      message: "Failed to create delivery run.",
      error: error.message,
    });
  }
};

// Get all delivery runs
const getDeliveryRuns = async (req, res) => {
  try {
    const deliveryRuns = await DeliveryRun.find().sort({
      runDate: -1,
      createdAt: -1,
    });

    res.status(200).json(deliveryRuns);
  } catch (error) {
    console.error("Get delivery runs error:", error);

    res.status(500).json({
      message: "Failed to fetch delivery runs.",
      error: error.message,
    });
  }
};

// Get delivery run by ID
const getDeliveryRunById = async (req, res) => {
  try {
    const deliveryRun = await DeliveryRun.findById(req.params.id);

    if (!deliveryRun) {
      return res.status(404).json({
        message: "Delivery run not found.",
      });
    }

    res.status(200).json(deliveryRun);
  } catch (error) {
    console.error("Get delivery run error:", error);

    res.status(500).json({
      message: "Failed to fetch delivery run.",
      error: error.message,
    });
  }
};

module.exports = {
  createDeliveryRun,
  getDeliveryRuns,
  getDeliveryRunById,
};