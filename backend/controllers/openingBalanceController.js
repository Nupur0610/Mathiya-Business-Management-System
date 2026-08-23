const mongoose = require("mongoose");

const OpeningBalance = require("../models/OpeningBalance");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const Distributor = require("../models/Distributor");
const { createStockTransaction } = require("../services/stockService");

// Create opening balance
const createOpeningBalance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      type,
      shop,
      distributor,
      product,
      quantity,
      amount,
      asOfDate,
      notes,
    } = req.body;

    // Basic validation
    if (!type || !asOfDate) {
      return res.status(400).json({
        message: "type and asOfDate are required.",
      });
    }

    const allowedTypes = [
      "cash",
      "gpay",
      "stock",
      "shop_receivable",
      "distributor_payable",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid opening balance type.",
      });
    }

    // Type-specific validation
    if (type === "cash" || type === "gpay") {
      if (amount === undefined || amount < 0) {
        return res.status(400).json({
          message: "A valid amount is required.",
        });
      }
    }

    if (type === "stock") {
      if (!product) {
        return res.status(400).json({
          message: "Product is required for opening stock.",
        });
      }

      if (quantity === undefined || quantity <= 0) {
        return res.status(400).json({
          message: "Opening stock quantity must be greater than 0.",
        });
      }
    }

    if (type === "shop_receivable") {
      if (!shop) {
        return res.status(400).json({
          message: "Shop is required for shop receivable.",
        });
      }

      if (amount === undefined || amount < 0) {
        return res.status(400).json({
          message: "A valid amount is required.",
        });
      }
    }

    if (type === "distributor_payable") {
      if (!distributor) {
        return res.status(400).json({
          message: "Distributor is required for distributor payable.",
        });
      }

      if (amount === undefined || amount < 0) {
        return res.status(400).json({
          message: "A valid amount is required.",
        });
      }
    }

    session.startTransaction();

    // Validate referenced records
    if (type === "stock") {
      const existingProduct = await Product.findById(product).session(
        session
      );

      if (!existingProduct) {
        throw new Error("Product not found.");
      }
    }

    if (type === "shop_receivable") {
      const existingShop = await Shop.findById(shop).session(session);

      if (!existingShop) {
        throw new Error("Shop not found.");
      }
    }

    if (type === "distributor_payable") {
      const existingDistributor = await Distributor.findById(
        distributor
      ).session(session);

      if (!existingDistributor) {
        throw new Error("Distributor not found.");
      }
    }

    // Create opening balance
    const openingBalanceResult = await OpeningBalance.create(
      [
        {
          type,
          shop: type === "shop_receivable" ? shop : undefined,
          distributor:
            type === "distributor_payable" ? distributor : undefined,
          product: type === "stock" ? product : undefined,
          quantity: type === "stock" ? quantity : undefined,
          amount:
            type === "stock"
              ? undefined
              : amount,
          asOfDate,
          notes,
        },
      ],
      { session }
    );

    const openingBalance = openingBalanceResult[0];

    // Opening stock must also become a stock transaction
    if (type === "stock") {
      await createStockTransaction({
        product,
        type: "ADJUSTMENT_IN",
        quantity,
        referenceType: "OpeningBalance",
        referenceId: openingBalance._id,
        transactionDate: asOfDate,
        notes: `Opening stock for ${openingBalance._id}`,
        session,
      });
    }

    await session.commitTransaction();

    const populatedOpeningBalance = await OpeningBalance.findById(
      openingBalance._id
    )
      .populate("product")
      .populate("shop")
      .populate("distributor");

    res.status(201).json({
      message: "Opening balance created successfully.",
      openingBalance: populatedOpeningBalance,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create opening balance error:", error);

    res.status(400).json({
      message: "Failed to create opening balance.",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Get all opening balances
const getOpeningBalances = async (req, res) => {
  try {
    const openingBalances = await OpeningBalance.find()
      .populate("product")
      .populate("shop")
      .populate("distributor")
      .sort({ asOfDate: -1, createdAt: -1 });

    res.status(200).json(openingBalances);
  } catch (error) {
    console.error("Get opening balances error:", error);

    res.status(500).json({
      message: "Failed to fetch opening balances.",
      error: error.message,
    });
  }
};

module.exports = {
  createOpeningBalance,
  getOpeningBalances,
};