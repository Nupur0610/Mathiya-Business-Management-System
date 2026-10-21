const Distributor = require("../models/Distributor");

const getDistributors = async (req, res) => {
  try {
    const distributors = await Distributor.find({ isActive: true }).sort({
      name: 1,
    });

    res.status(200).json(distributors);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch distributors",
      error: error.message,
    });
  }
};

const createDistributor = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Distributor name is required",
      });
    }

    const distributor = await Distributor.create({
      name,
      phone,
      address,
    });

    res.status(201).json(distributor);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create distributor",
      error: error.message,
    });
  }
};


const {
  getDistributorOutstanding,
} = require("../services/outstandingService");

const updateDistributor = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Distributor name is required",
      });
    }

    const distributor = await Distributor.findByIdAndUpdate(
      req.params.id,
      { name, phone, address },
      { new: true, runValidators: true }
    );

    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    res.status(200).json(distributor);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update distributor",
      error: error.message,
    });
  }
};

// Hides the distributor (old records keep working). Needs zero payable.
const deleteDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const { outstanding } = await getDistributorOutstanding(
      distributor._id
    );

    if (Math.abs(outstanding) > 0.005) {
      return res.status(400).json({
        message: `You still owe this distributor ₹${outstanding}. Clear it (payment, return or correction) before deleting the distributor.`,
      });
    }

    distributor.isActive = false;
    await distributor.save();

    res.status(200).json({ message: "Distributor deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete distributor",
      error: error.message,
    });
  }
};

module.exports = {
  getDistributors,
  createDistributor,
  updateDistributor,
  deleteDistributor,
};