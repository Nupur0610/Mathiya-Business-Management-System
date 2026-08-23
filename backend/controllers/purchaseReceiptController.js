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

module.exports = {
  createPurchaseReceipt,
  getPurchaseReceipts,
};