const mongoose = require("mongoose");

const Return = require("../models/Return");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const Distributor = require("../models/Distributor");

const { createStockTransaction } = require("../services/stockService");

// Create return
const createReturn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      returnType,
      shop,
      distributor,
      items,
      returnDate,
      reason,
      notes,
    } = req.body;

    // Basic validation
    if (!returnType) {
      return res.status(400).json({
        message: "returnType is required.",
      });
    }

    if (!["from_shop", "to_distributor"].includes(returnType)) {
      return res.status(400).json({
        message: "Invalid return type.",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Return must contain at least one item.",
      });
    }

    // Validate return party
    if (returnType === "from_shop" && !shop) {
      return res.status(400).json({
        message: "Shop is required for a return from shop.",
      });
    }

    if (returnType === "to_distributor" && !distributor) {
      return res.status(400).json({
        message: "Distributor is required for a return to distributor.",
      });
    }

    session.startTransaction();

    // Validate shop
    if (returnType === "from_shop") {
      const existingShop = await Shop.findById(shop).session(session);

      if (!existingShop) {
        throw new Error("Shop not found.");
      }
    }

    // Validate distributor
    if (returnType === "to_distributor") {
      const existingDistributor = await Distributor.findById(
        distributor
      ).session(session);

      if (!existingDistributor) {
        throw new Error("Distributor not found.");
      }
    }

    // Validate products and quantities
    for (const item of items) {
      if (!item.product) {
        throw new Error("Product is required for every return item.");
      }

      if (item.quantity === undefined || item.quantity <= 0) {
        throw new Error(
          "Return quantity must be greater than 0."
        );
      }

      const existingProduct = await Product.findById(
        item.product
      ).session(session);

      if (!existingProduct) {
        throw new Error(
          `Product ${item.product} not found.`
        );
      }
    }

    // Create return
    const returnResult = await Return.create(
      [
        {
          returnType,
          shop: returnType === "from_shop" ? shop : undefined,
          distributor:
            returnType === "to_distributor"
              ? distributor
              : undefined,
          items,
          returnDate,
          reason,
          notes,
        },
      ],
      { session }
    );

    const createdReturn = returnResult[0];

    // Create stock transactions
    for (const item of createdReturn.items) {
      await createStockTransaction({
        product: item.product,
        type:
          returnType === "from_shop"
            ? "SALES_RETURN"
            : "PURCHASE_RETURN",
        quantity: item.quantity,
        referenceType: "Return",
        referenceId: createdReturn._id,
        transactionDate: createdReturn.returnDate,
        notes: `Stock transaction created from return ${createdReturn._id}`,
        session,
      });
    }

    await session.commitTransaction();

    const populatedReturn = await Return.findById(
      createdReturn._id
    )
      .populate("shop")
      .populate("distributor")
      .populate("items.product");

    res.status(201).json({
      message: "Return created successfully.",
      return: populatedReturn,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create return error:", error);

    res.status(400).json({
      message: "Failed to create return.",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Get all returns
const getReturns = async (req, res) => {
  try {
    const returns = await Return.find()
      .populate("shop")
      .populate("distributor")
      .populate("items.product")
      .sort({ returnDate: -1, createdAt: -1 });

    res.status(200).json(returns);
  } catch (error) {
    console.error("Get returns error:", error);

    res.status(500).json({
      message: "Failed to fetch returns.",
      error: error.message,
    });
  }
};

module.exports = {
  createReturn,
  getReturns,
};