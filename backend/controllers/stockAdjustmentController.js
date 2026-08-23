const StockAdjustment = require("../models/StockAdjustment");
const Product = require("../models/Product");
const {
    createStockTransaction,
    getStockQuantity,
  } = require("../services/stockService");
// Create stock adjustment
const createStockAdjustment = async (req, res) => {
  try {
    const {
      product,
      quantity,
      type,
      reason,
      adjustmentDate,
      notes,
    } = req.body;

    // Basic validation
    if (!product || quantity === undefined || !type || !reason) {
      return res.status(400).json({
        message:
          "product, quantity, type and reason are required.",
      });
    }

    if (!["increase", "decrease"].includes(type)) {
      return res.status(400).json({
        message: "Type must be increase or decrease.",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0.",
      });
    }

    // Validate product
    const existingProduct = await Product.findById(product);

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }
// Prevent stock from becoming negative
    if (type === "decrease") {
    const currentStock = await getStockQuantity(product);
  
    if (quantity > currentStock) {
      return res.status(400).json({
        message: `Insufficient stock. Current stock is ${currentStock} kg.`,
      });
    }
  }
    // Create adjustment
    const adjustment = await StockAdjustment.create({
      product,
      quantity,
      type,
      reason,
      adjustmentDate,
      notes,
    });

    // Convert adjustment into stock transaction
    await createStockTransaction({
      product,
      type:
        type === "increase"
          ? "ADJUSTMENT_IN"
          : "ADJUSTMENT_OUT",
      quantity,
      referenceType: "StockAdjustment",
      referenceId: adjustment._id,
      transactionDate: adjustmentDate,
      notes: `Stock adjustment ${adjustment._id}`,
    });

    const populatedAdjustment =
      await StockAdjustment.findById(adjustment._id)
        .populate("product");

    res.status(201).json({
      message: "Stock adjustment created successfully.",
      adjustment: populatedAdjustment,
    });
  } catch (error) {
    console.error(
      "Create stock adjustment error:",
      error
    );

    res.status(500).json({
      message: "Failed to create stock adjustment.",
      error: error.message,
    });
  }
};

// Get all stock adjustments
const getStockAdjustments = async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate("product")
      .sort({
        adjustmentDate: -1,
        createdAt: -1,
      });

    res.status(200).json(adjustments);
  } catch (error) {
    console.error(
      "Get stock adjustments error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch stock adjustments.",
      error: error.message,
    });
  }
};

module.exports = {
  createStockAdjustment,
  getStockAdjustments,
};