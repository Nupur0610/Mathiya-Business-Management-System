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

module.exports = {
  getDistributors,
  createDistributor,
};