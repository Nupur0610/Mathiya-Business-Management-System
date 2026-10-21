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


const mongoose = require("mongoose");
const {
  deleteStockTransactionsByReference,
  assertStockNotNegative,
} = require("../services/stockService");

const updateStockAdjustment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { product, quantity, type, reason, adjustmentDate, notes } =
      req.body;

    if (!product || quantity === undefined || !type || !reason) {
      return res.status(400).json({
        message: "product, quantity, type and reason are required.",
      });
    }

    if (!["increase", "decrease"].includes(type)) {
      return res.status(400).json({
        message: "Type must be increase or decrease.",
      });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0.",
      });
    }

    session.startTransaction();

    const adjustment = await StockAdjustment.findById(
      req.params.id
    ).session(session);

    if (!adjustment) {
      throw new Error("Stock adjustment not found.");
    }

    const existingProduct = await Product.findById(product).session(
      session
    );

    if (!existingProduct) {
      throw new Error("Product not found.");
    }

    const oldProduct = adjustment.product;

    adjustment.product = product;
    adjustment.quantity = Number(quantity);
    adjustment.type = type;
    adjustment.reason = reason;
    if (adjustmentDate) adjustment.adjustmentDate = adjustmentDate;
    adjustment.notes = notes;

    await adjustment.save({ session });

    await deleteStockTransactionsByReference(
      "StockAdjustment",
      adjustment._id,
      session
    );

    await createStockTransaction({
      product,
      type: type === "increase" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      quantity: Number(quantity),
      referenceType: "StockAdjustment",
      referenceId: adjustment._id,
      transactionDate: adjustment.adjustmentDate,
      notes: `Stock adjustment ${adjustment._id}`,
      session,
    });

    await assertStockNotNegative([oldProduct, product], session);

    await session.commitTransaction();

    const populated = await StockAdjustment.findById(
      adjustment._id
    ).populate("product");

    res.status(200).json({
      message: "Stock adjustment updated.",
      adjustment: populated,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Update stock adjustment error:", error);

    res.status(400).json({
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

const deleteStockAdjustment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const adjustment = await StockAdjustment.findById(
      req.params.id
    ).session(session);

    if (!adjustment) {
      throw new Error("Stock adjustment not found.");
    }

    await deleteStockTransactionsByReference(
      "StockAdjustment",
      adjustment._id,
      session
    );

    await StockAdjustment.deleteOne({ _id: adjustment._id }, { session });

    await assertStockNotNegative([adjustment.product], session);

    await session.commitTransaction();

    res.status(200).json({ message: "Stock adjustment deleted." });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Delete stock adjustment error:", error);

    res.status(400).json({
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createStockAdjustment,
  getStockAdjustments,
  updateStockAdjustment,
  deleteStockAdjustment,
};