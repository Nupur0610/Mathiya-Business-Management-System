const PurchaseOrder = require("../models/PurchaseOrder");

const createPurchaseOrder = async (req, res) => {
  try {
    const { distributor, items, orderDate, notes } = req.body;

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

    const populatedOrder = await purchaseOrder.populate([
      { path: "distributor" },
      { path: "items.product" },
    ]);

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error("Create purchase order error:", error);

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
    console.error("Get purchase orders error:", error);

    res.status(500).json({
      message: "Failed to fetch purchase orders",
      error: error.message,
    });
  }
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
};