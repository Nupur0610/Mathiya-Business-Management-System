const PurchasePrice = require("../models/PurchasePrice");

const createOrUpdatePurchasePrice = async (req, res) => {
  try {
    const {
      distributor,
      product,
      pricePerKg,
    } = req.body;

    if (!distributor || !product) {
      return res.status(400).json({
        message: "Distributor and product are required",
      });
    }

    if (
      pricePerKg === undefined ||
      pricePerKg === null ||
      pricePerKg === "" ||
      Number(pricePerKg) < 0
    ) {
      return res.status(400).json({
        message: "Valid price per kg is required",
      });
    }

    const price = await PurchasePrice.findOneAndUpdate(
      {
        distributor,
        product,
      },
      {
        distributor,
        product,
        pricePerKg: Number(pricePerKg),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).populate([
      { path: "distributor" },
      { path: "product" },
    ]);

    res.status(200).json(price);
  } catch (error) {
    console.error(
      "Create/update purchase price error:",
      error
    );

    res.status(500).json({
      message: "Failed to save purchase price",
      error: error.message,
    });
  }
};

const getPurchasePrice = async (req, res) => {
  try {
    const { distributorId, productId } = req.params;

    const price = await PurchasePrice.findOne({
      distributor: distributorId,
      product: productId,
    });

    if (!price) {
      return res.status(404).json({
        message: "Purchase price not found",
      });
    }

    res.status(200).json(price);
  } catch (error) {
    console.error(
      "Get purchase price error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch purchase price",
      error: error.message,
    });
  }
};

const getPurchasePrices = async (req, res) => {
  try {
    const prices = await PurchasePrice.find()
      .populate("distributor")
      .populate("product")
      .sort({ updatedAt: -1 });

    res.status(200).json(prices);
  } catch (error) {
    console.error(
      "Get purchase prices error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch purchase prices",
      error: error.message,
    });
  }
};

module.exports = {
  createOrUpdatePurchasePrice,
  getPurchasePrice,
  getPurchasePrices,
};