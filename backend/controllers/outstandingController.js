const Shop = require("../models/Shop");
const Distributor = require("../models/Distributor");

const {
  getShopOutstanding,
  getDistributorOutstanding,
} = require("../services/outstandingService");

// Get outstanding for one shop
const getShopOutstandingController = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found.",
      });
    }

    const outstanding = await getShopOutstanding(shopId);

    res.status(200).json({
      shop: {
        _id: shop._id,
        name: shop.name,
      },
      ...outstanding,
    });
  } catch (error) {
    console.error("Get shop outstanding error:", error);

    res.status(500).json({
      message: "Failed to calculate shop outstanding.",
      error: error.message,
    });
  }
};

// Get outstanding for one distributor
const getDistributorOutstandingController = async (req, res) => {
  try {
    const { distributorId } = req.params;

    const distributor = await Distributor.findById(distributorId);

    if (!distributor) {
      return res.status(404).json({
        message: "Distributor not found.",
      });
    }

    const outstanding = await getDistributorOutstanding(distributorId);

    res.status(200).json({
      distributor: {
        _id: distributor._id,
        name: distributor.name,
      },
      ...outstanding,
    });
  } catch (error) {
    console.error("Get distributor outstanding error:", error);

    res.status(500).json({
      message: "Failed to calculate distributor outstanding.",
      error: error.message,
    });
  }
};

module.exports = {
  getShopOutstandingController,
  getDistributorOutstandingController,
};