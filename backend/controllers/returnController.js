const mongoose = require("mongoose");

const Return = require("../models/Return");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const Distributor = require("../models/Distributor");
const Delivery = require("../models/Delivery");
const PurchaseReceipt = require("../models/PurchaseReceipt");

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

    // -----------------------------
    // Basic validation
    // -----------------------------

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

    // -----------------------------
    // Validate shop
    // -----------------------------

    if (returnType === "from_shop") {
      const existingShop = await Shop.findById(shop).session(session);

      if (!existingShop) {
        throw new Error("Shop not found.");
      }
    }

    // -----------------------------
    // Validate distributor
    // -----------------------------

    if (returnType === "to_distributor") {
      const existingDistributor = await Distributor.findById(
        distributor
      ).session(session);

      if (!existingDistributor) {
        throw new Error("Distributor not found.");
      }
    }

    // -----------------------------
    // Validate each return item
    // -----------------------------

    for (const item of items) {
      if (!item.product) {
        throw new Error(
          "Product is required for every return item."
        );
      }

      if (item.quantity === undefined || item.quantity <= 0) {
        throw new Error(
          "Return quantity must be greater than 0."
        );
      }

      if (
        item.pricePerKg === undefined ||
        item.pricePerKg === null ||
        item.pricePerKg < 0
      ) {
        throw new Error(
          "Price per kg is required for every return item."
        );
      }

      // Make sure product exists
      const existingProduct = await Product.findById(
        item.product
      ).session(session);

      if (!existingProduct) {
        throw new Error(
          `Product ${item.product} not found.`
        );
      }

      // -----------------------------
      // SALES RETURN
      // -----------------------------

      if (returnType === "from_shop") {
        // Find all deliveries made to this shop
        const deliveries = await Delivery.find({
          shop,
        }).session(session);

        let totalDelivered = 0;

        for (const delivery of deliveries) {
          for (const deliveredItem of delivery.items) {
            if (
              deliveredItem.product.toString() ===
              item.product.toString()
            ) {
              totalDelivered += deliveredItem.quantityDelivered;
            }
          }
        }

        // Find previous sales returns for this shop/product
        const previousReturns = await Return.find({
          returnType: "from_shop",
          shop,
        }).session(session);

        let totalPreviouslyReturned = 0;

        for (const previousReturn of previousReturns) {
          for (const returnedItem of previousReturn.items) {
            if (
              returnedItem.product.toString() ===
              item.product.toString()
            ) {
              totalPreviouslyReturned += returnedItem.quantity;
            }
          }
        }

        const returnableQuantity =
          totalDelivered - totalPreviouslyReturned;

        if (item.quantity > returnableQuantity) {
          throw new Error(
            `Cannot return ${item.quantity} kg of product ${item.product}. ` +
            `Only ${returnableQuantity} kg is available for return.`
          );
        }
      }

      // -----------------------------
      // PURCHASE RETURN
      // -----------------------------

      if (returnType === "to_distributor") {
        // Find all purchase receipts from this distributor
        const receipts = await PurchaseReceipt.find({
          distributor,
        }).session(session);

        let totalReceived = 0;

        for (const receipt of receipts) {
          for (const receivedItem of receipt.items) {
            if (
              receivedItem.product.toString() ===
              item.product.toString()
            ) {
              totalReceived += receivedItem.quantityReceived;
            }
          }
        }

        // Find previous purchase returns for this distributor/product
        const previousReturns = await Return.find({
          returnType: "to_distributor",
          distributor,
        }).session(session);

        let totalPreviouslyReturned = 0;

        for (const previousReturn of previousReturns) {
          for (const returnedItem of previousReturn.items) {
            if (
              returnedItem.product.toString() ===
              item.product.toString()
            ) {
              totalPreviouslyReturned += returnedItem.quantity;
            }
          }
        }

        const returnableQuantity =
          totalReceived - totalPreviouslyReturned;

        if (item.quantity > returnableQuantity) {
          throw new Error(
            `Cannot return ${item.quantity} kg of product ${item.product}. ` +
            `Only ${returnableQuantity} kg is available for return.`
          );
        }
      }
    }

    // -----------------------------
    // Create return
    // -----------------------------

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

    // -----------------------------
    // Create stock transactions
    // -----------------------------

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

    // -----------------------------
    // Commit transaction
    // -----------------------------

    await session.commitTransaction();

    // Populate result after transaction completes
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


const {
  deleteStockTransactionsByReference,
  assertStockNotNegative,
} = require("../services/stockService");
const { sumByProduct } = require("../services/orderStatus");

// Same checks as creating a return, but ignores the return being edited
const validateReturnForUpdate = async (
  returnType,
  party,
  items,
  excludeId,
  session
) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Return must contain at least one item.");
  }

  for (const item of items) {
    if (!item.product) {
      throw new Error("Product is required for every return item.");
    }

    if (!(Number(item.quantity) > 0)) {
      throw new Error("Return quantity must be greater than 0.");
    }

    if (item.pricePerKg === undefined || !(Number(item.pricePerKg) >= 0)) {
      throw new Error("Price per kg is required for every return item.");
    }

    if (!(await Product.findById(item.product).session(session))) {
      throw new Error("Product not found.");
    }
  }

  const newTotals = sumByProduct(items, "quantity");

  if (returnType === "from_shop") {
    if (!party || !(await Shop.findById(party).session(session))) {
      throw new Error("Shop not found.");
    }

    const deliveries = await Delivery.find({ shop: party }).session(session);
    const others = await Return.find({
      returnType: "from_shop",
      shop: party,
      _id: { $ne: excludeId },
    }).session(session);

    const delivered = sumByProduct(
      deliveries.flatMap((d) => d.items),
      "quantityDelivered"
    );
    const returned = sumByProduct(
      others.flatMap((r) => r.items),
      "quantity"
    );

    for (const [productId, qty] of Object.entries(newTotals)) {
      const available =
        (delivered[productId] || 0) - (returned[productId] || 0);

      if (qty > available + 0.0001) {
        throw new Error(
          `Cannot return ${qty} kg. Only ${available} kg is available for return.`
        );
      }
    }
  } else {
    if (!party || !(await Distributor.findById(party).session(session))) {
      throw new Error("Distributor not found.");
    }

    const receipts = await PurchaseReceipt.find({
      distributor: party,
    }).session(session);
    const others = await Return.find({
      returnType: "to_distributor",
      distributor: party,
      _id: { $ne: excludeId },
    }).session(session);

    const received = sumByProduct(
      receipts.flatMap((r) => r.items),
      "quantityReceived"
    );
    const returned = sumByProduct(
      others.flatMap((r) => r.items),
      "quantity"
    );

    for (const [productId, qty] of Object.entries(newTotals)) {
      const available =
        (received[productId] || 0) - (returned[productId] || 0);

      if (qty > available + 0.0001) {
        throw new Error(
          `Cannot return ${qty} kg. Only ${available} kg is available for return.`
        );
      }
    }
  }
};

const updateReturn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { shop, distributor, items, returnDate, reason, notes } =
      req.body;

    session.startTransaction();

    const record = await Return.findById(req.params.id).session(session);

    if (!record) {
      throw new Error("Return not found.");
    }

    const party =
      record.returnType === "from_shop"
        ? shop || record.shop
        : distributor || record.distributor;

    await validateReturnForUpdate(
      record.returnType,
      party,
      items,
      record._id,
      session
    );

    const oldProducts = record.items.map((item) => item.product);

    if (record.returnType === "from_shop") {
      record.shop = party;
    } else {
      record.distributor = party;
    }

    record.items = items.map((item) => ({
      product: item.product,
      quantity: Number(item.quantity),
      pricePerKg: Number(item.pricePerKg),
    }));
    if (returnDate) record.returnDate = returnDate;
    record.reason = reason;
    record.notes = notes;

    await record.save({ session });

    await deleteStockTransactionsByReference("Return", record._id, session);

    for (const item of record.items) {
      await createStockTransaction({
        product: item.product,
        type:
          record.returnType === "from_shop"
            ? "SALES_RETURN"
            : "PURCHASE_RETURN",
        quantity: item.quantity,
        referenceType: "Return",
        referenceId: record._id,
        transactionDate: record.returnDate,
        notes: `Stock transaction created from return ${record._id}`,
        session,
      });
    }

    await assertStockNotNegative(
      [...oldProducts, ...record.items.map((item) => item.product)],
      session
    );

    await session.commitTransaction();

    const populated = await Return.findById(record._id)
      .populate("shop")
      .populate("distributor")
      .populate("items.product");

    res.status(200).json({
      message: "Return updated successfully.",
      return: populated,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Update return error:", error);

    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

const deleteReturn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const record = await Return.findById(req.params.id).session(session);

    if (!record) {
      throw new Error("Return not found.");
    }

    await deleteStockTransactionsByReference("Return", record._id, session);

    await Return.deleteOne({ _id: record._id }, { session });

    await assertStockNotNegative(
      record.items.map((item) => item.product),
      session
    );

    await session.commitTransaction();

    res.status(200).json({ message: "Return deleted successfully." });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Delete return error:", error);

    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createReturn,
  getReturns,
  updateReturn,
  deleteReturn,
};