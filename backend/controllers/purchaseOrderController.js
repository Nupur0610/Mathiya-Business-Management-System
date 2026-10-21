
const PurchaseOrder = require("../models/PurchaseOrder");
const PurchasePrice = require("../models/PurchasePrice");

const createPurchaseOrder = async (req, res) => {
  try {
    const {
      distributor,
      items,
      orderDate,
      notes,
    } = req.body;

    if (!distributor) {
      return res.status(400).json({
        message: "Distributor is required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    const purchaseOrder = await PurchaseOrder.create({
      distributor,
      items,
      orderDate,
      notes,
    });

    for (const item of items) {
      await PurchasePrice.findOneAndUpdate(
        {
          distributor,
          product: item.product,
        },
        {
          distributor,
          product: item.product,
          pricePerKg: Number(item.pricePerKg),
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );
    }

    const populatedOrder =
      await purchaseOrder.populate([
        { path: "distributor" },
        { path: "items.product" },
      ]);

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error(
      "Create purchase order error:",
      error
    );

    res.status(500).json({
      message: "Failed to create purchase order",
      error: error.message,
    });
  }
};

const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate("distributor")
      .populate("items.product")
      .sort({ orderDate: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error(
      "Get purchase orders error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch purchase orders",
      error: error.message,
    });
  }
};


const PurchaseReceiptModel = require("../models/PurchaseReceipt");
const {
  computeOrderStatus,
  sumByProduct,
} = require("../services/orderStatus");

const updatePurchaseOrder = async (req, res) => {
  try {
    const { distributor, items, orderDate, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    for (const item of items) {
      if (!item.product) {
        throw new Error("Product is required for every item");
      }

      if (!(Number(item.quantity) > 0)) {
        throw new Error("Quantity must be greater than 0");
      }

      if (
        item.pricePerKg === undefined ||
        !(Number(item.pricePerKg) >= 0)
      ) {
        throw new Error("A valid price per kg is required for every item");
      }
    }

    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const receipts = await PurchaseReceiptModel.find({
      purchaseOrder: order._id,
    });

    if (receipts.length > 0) {
      if (distributor && String(distributor) !== String(order.distributor)) {
        throw new Error(
          "The distributor cannot be changed because stock was already received for this order."
        );
      }

      const received = sumByProduct(
        receipts.flatMap((r) => r.items),
        "quantityReceived"
      );
      const ordered = sumByProduct(items, "quantity");

      for (const [productId, qty] of Object.entries(received)) {
        if ((ordered[productId] || 0) + 0.0001 < qty) {
          throw new Error(
            `Ordered quantity cannot be less than what is already received (${qty} kg). Edit the receipt first.`
          );
        }
      }
    }

    order.distributor = distributor || order.distributor;
    order.items = items.map((item) => ({
      product: item.product,
      quantity: Number(item.quantity),
      pricePerKg: Number(item.pricePerKg),
    }));
    if (orderDate) order.orderDate = orderDate;
    order.notes = notes;

    order.status = computeOrderStatus(
      order.items,
      receipts.flatMap((r) => r.items),
      "quantityReceived",
      order.status
    );

    await order.save();

    const populated = await PurchaseOrder.findById(order._id)
      .populate("distributor")
      .populate("items.product");

    res.status(200).json(populated);
  } catch (error) {
    console.error("Update purchase order error:", error);

    res.status(400).json({ message: error.message });
  }
};

const deletePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const receiptCount = await PurchaseReceiptModel.countDocuments({
      purchaseOrder: order._id,
    });

    if (receiptCount > 0) {
      return res.status(400).json({
        message: `This order has ${receiptCount} receipt record(s). Delete those receipts first, then delete the order.`,
      });
    }

    await PurchaseOrder.deleteOne({ _id: order._id });

    res.status(200).json({ message: "Purchase order deleted" });
  } catch (error) {
    console.error("Delete purchase order error:", error);

    res.status(500).json({
      message: "Failed to delete purchase order",
      error: error.message,
    });
  }
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrder,
  deletePurchaseOrder,
};

