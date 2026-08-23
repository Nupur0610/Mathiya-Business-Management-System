const Product = require("../models/Product");

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({
      name: 1,
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, brand, unit } = req.body;

    if (!name || !brand) {
      return res.status(400).json({
        message: "Name and brand are required",
      });
    }

    const product = await Product.create({
      name,
      brand,
      unit: unit || "kg",
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
};