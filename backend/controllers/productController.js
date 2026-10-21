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


const { getStockQuantity } = require("../services/stockService");

const updateProduct = async (req, res) => {
  try {
    const { name, brand } = req.body;

    if (!name || !brand) {
      return res.status(400).json({
        message: "Name and brand are required",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, brand },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// Hides the product (old records keep working). Needs zero stock.
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const stock = await getStockQuantity(product._id);

    if (Math.abs(stock) > 0.0001) {
      return res.status(400).json({
        message: `This product still has ${stock} kg in stock. Set its stock to 0 (Stock Adjustments) before deleting it.`,
      });
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};