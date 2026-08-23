const Product = require("../models/Product");
const { getStockQuantity } = require("../services/stockService");

const getCurrentStock = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
    });

    const stock = [];

    for (const product of products) {
      const quantity = await getStockQuantity(product._id);

      stock.push({
        product: product._id,
        name: product.name,
        brand: product.brand,
        unit: product.unit,
        quantity,
      });
    }

    res.status(200).json(stock);
  } catch (error) {
    console.error("Get current stock error:", error);

    res.status(500).json({
      message: "Failed to fetch current stock",
      error: error.message,
    });
  }
};

module.exports = {
  getCurrentStock,
};