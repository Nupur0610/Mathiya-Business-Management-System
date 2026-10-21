const mongoose = require("mongoose");
const PurchaseReceipt = require("../models/PurchaseReceipt");
const PurchaseOrder = require("../models/PurchaseOrder");
const { createStockTransaction } = require("../services/stockService");

const createPurchaseReceipt = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { purchaseOrder, distributor, items, receivedAt, notes } = req.body;

    if (!purchaseOrder || !distributor) {
      return res.status(400).json({
        message: "Purchase order and distributor are required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Purchase receipt must contain at least one item",
      });
    }

    session.startTransaction();

    // Find the purchase order
    const order = await PurchaseOrder.findById(purchaseOrder).session(session);

    if (!order) {
      throw new Error("Purchase order not found");
    }

    // Make sure the distributor matches the purchase order
    if (order.distributor.toString() !== distributor.toString()) {
      throw new Error("Distributor does not match the purchase order");
    }

    // Cancelled orders cannot receive stock
    if (order.status === "cancelled") {
      throw new Error("Cannot receive stock for a cancelled purchase order");
    }

    // Get all previous receipts for this purchase order
    const previousReceipts = await PurchaseReceipt.find({
      purchaseOrder,
    }).session(session);

    // Validate each receipt item
    for (const item of items) {
      const orderItem = order.items.find(
        (orderItem) =>
          orderItem.product.toString() === item.product.toString()
      );

      if (!orderItem) {
        throw new Error(
          `Product ${item.product} does not exist in the purchase order`
        );
      }

      // Calculate quantity already received for this product
      let alreadyReceived = 0;

      for (const receipt of previousReceipts) {
        for (const receivedItem of receipt.items) {
          if (
            receivedItem.product.toString() === item.product.toString()
          ) {
            alreadyReceived += receivedItem.quantityReceived;
          }
        }
      }

      const remainingQuantity =
        orderItem.quantity - alreadyReceived;

      if (item.quantityReceived > remainingQuantity) {
        throw new Error(
          `Cannot receive ${item.quantityReceived} kg of product ${item.product}. Only ${remainingQuantity} kg remaining.`
        );
      }

      if (item.quantityReceived <= 0) {
        throw new Error(
          "Received quantity must be greater than 0"
        );
      }
    }

    // Create purchase receipt
    const receipt = await PurchaseReceipt.create(
      [
        {
          purchaseOrder,
          distributor,
          items,
          receivedAt,
          notes,
        },
      ],
      { session }
    );

    const createdReceipt = receipt[0];

    // Create stock transactions
    for (const item of createdReceipt.items) {
      await createStockTransaction({
        product: item.product,
        type: "PURCHASE_RECEIPT",
        quantity: item.quantityReceived,
        referenceType: "PurchaseReceipt",
        referenceId: createdReceipt._id,
        transactionDate: createdReceipt.receivedAt,
        notes: `Stock received through purchase receipt ${createdReceipt._id}`,
        session,
      });
    }

    // Update purchase order status
    let allCompleted = true;
    let anyReceived = false;

    for (const orderItem of order.items) {
      let totalReceived = 0;

      for (const receipt of previousReceipts) {
        for (const receivedItem of receipt.items) {
          if (
            receivedItem.product.toString() ===
            orderItem.product.toString()
          ) {
            totalReceived += receivedItem.quantityReceived;
          }
        }
      }

      // Include the current receipt
      for (const receivedItem of createdReceipt.items) {
        if (
          receivedItem.product.toString() ===
          orderItem.product.toString()
        ) {
          totalReceived += receivedItem.quantityReceived;
        }
      }

      if (totalReceived > 0) {
        anyReceived = true;
      }

      if (totalReceived < orderItem.quantity) {
        allCompleted = false;
      }
    }

    if (allCompleted) {
      order.status = "completed";
    } else if (anyReceived) {
      order.status = "partial";
    } else {
      order.status = "pending";
    }

    await order.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      message: "Purchase receipt created successfully",
      receipt: createdReceipt,
      purchaseOrderStatus: order.status,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create purchase receipt error:", error);

    res.status(400).json({
      message: "Failed to create purchase receipt",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const getPurchaseReceipts = async (req, res) => {
  try {
    const receipts = await PurchaseReceipt.find()
      .populate("purchaseOrder")
      .populate("distributor")
      .populate("items.product");

    res.status(200).json(receipts);
  } catch (error) {
    console.error("Get purchase receipts error:", error);

    res.status(500).json({
      message: "Failed to fetch purchase receipts",
      error: error.message,
    });
  }
};


const {
  deleteStockTransactionsByReference,
  assertStockNotNegative,
} = require("../services/stockService");
const {
  computeOrderStatus,
  sumByProduct,
} = require("../services/orderStatus");
const {
  assertDistributorReturnsValid,
} = require("../services/integrityService");

const recomputePurchaseOrderStatus = async (orderId, session) => {
  const order = await PurchaseOrder.findById(orderId).session(session);

  if (!order) {
    return;
  }

  const receipts = await PurchaseReceipt.find({
    purchaseOrder: orderId,
  }).session(session);

  order.status = computeOrderStatus(
    order.items,
    receipts.flatMap((r) => r.items),
    "quantityReceived",
    order.status
  );

  await order.save({ session });
};

const updatePurchaseReceipt = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { items, receivedAt, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Purchase receipt must contain at least one item");
    }

    for (const item of items) {
      if (!item.product) {
        throw new Error("Product is required for every item");
      }

      if (!(Number(item.quantityReceived) > 0)) {
        throw new Error("Received quantity must be greater than 0");
      }

      if (
        item.pricePerKg === undefined ||
        !(Number(item.pricePerKg) >= 0)
      ) {
        throw new Error("A valid price per kg is required for every item");
      }
    }

    session.startTransaction();

    const receipt = await PurchaseReceipt.findById(req.params.id).session(
      session
    );

    if (!receipt) {
      throw new Error("Purchase receipt not found");
    }

    const order = await PurchaseOrder.findById(
      receipt.purchaseOrder
    ).session(session);

    if (!order) {
      throw new Error("Purchase order not found");
    }

    const otherReceipts = await PurchaseReceipt.find({
      purchaseOrder: receipt.purchaseOrder,
      _id: { $ne: receipt._id },
    }).session(session);

    const orderedTotals = sumByProduct(order.items, "quantity");
    const alreadyReceived = sumByProduct(
      otherReceipts.flatMap((r) => r.items),
      "quantityReceived"
    );
    const newTotals = sumByProduct(items, "quantityReceived");

    for (const [productId, qty] of Object.entries(newTotals)) {
      if (orderedTotals[productId] === undefined) {
        throw new Error(
          "A product in this receipt is not in the purchase order"
        );
      }

      const remaining =
        orderedTotals[productId] - (alreadyReceived[productId] || 0);

      if (qty > remaining + 0.0001) {
        throw new Error(
          `Cannot receive ${qty} kg. Only ${remaining} kg of this product is left on the order.`
        );
      }
    }

    const oldProducts = receipt.items.map((item) => item.product);

    receipt.items = items.map((item) => ({
      product: item.product,
      quantityReceived: Number(item.quantityReceived),
      pricePerKg: Number(item.pricePerKg),
    }));
    if (receivedAt) receipt.receivedAt = receivedAt;
    receipt.notes = notes;

    await receipt.save({ session });

    await deleteStockTransactionsByReference(
      "PurchaseReceipt",
      receipt._id,
      session
    );

    for (const item of receipt.items) {
      await createStockTransaction({
        product: item.product,
        type: "PURCHASE_RECEIPT",
        quantity: item.quantityReceived,
        referenceType: "PurchaseReceipt",
        referenceId: receipt._id,
        transactionDate: receipt.receivedAt,
        notes: `Stock received through purchase receipt ${receipt._id}`,
        session,
      });
    }

    await assertStockNotNegative(
      [...oldProducts, ...receipt.items.map((item) => item.product)],
      session
    );

    await assertDistributorReturnsValid(receipt.distributor, session);

    await recomputePurchaseOrderStatus(order._id, session);

    await session.commitTransaction();

    const populated = await PurchaseReceipt.findById(receipt._id)
      .populate("purchaseOrder")
      .populate("distributor")
      .populate("items.product");

    res.status(200).json({
      message: "Purchase receipt updated successfully",
      receipt: populated,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Update purchase receipt error:", error);

    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

const deletePurchaseReceipt = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const receipt = await PurchaseReceipt.findById(req.params.id).session(
      session
    );

    if (!receipt) {
      throw new Error("Purchase receipt not found");
    }

    await deleteStockTransactionsByReference(
      "PurchaseReceipt",
      receipt._id,
      session
    );

    await PurchaseReceipt.deleteOne({ _id: receipt._id }, { session });

    await assertStockNotNegative(
      receipt.items.map((item) => item.product),
      session
    );

    await assertDistributorReturnsValid(receipt.distributor, session);

    await recomputePurchaseOrderStatus(receipt.purchaseOrder, session);

    await session.commitTransaction();

    res.status(200).json({ message: "Purchase receipt deleted successfully" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Delete purchase receipt error:", error);

    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createPurchaseReceipt,
  getPurchaseReceipts,
  updatePurchaseReceipt,
  deletePurchaseReceipt,
};