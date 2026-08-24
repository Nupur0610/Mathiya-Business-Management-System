const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const ShopOrder = require("../models/ShopOrder");
const { createStockTransaction, getStockQuantity } = require("../services/stockService");

const createDelivery = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { shopOrder, shop, items, deliveredAt, deliveryRun, notes } = req.body;

    if (!shopOrder || !shop) {
      return res.status(400).json({
        message: "Shop order and shop are required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Delivery must contain at least one item",
      });
    }

    session.startTransaction();

    // Find the shop order
    const order = await ShopOrder.findById(shopOrder).session(session);

    if (!order) {
      throw new Error("Shop order not found");
    }

    // Make sure the shop matches the order
    if (order.shop.toString() !== shop.toString()) {
      throw new Error("Shop does not match the shop order");
    }

    // Cancelled orders cannot be delivered
    if (order.status === "cancelled") {
      throw new Error("Cannot deliver a cancelled shop order");
    }

    // Get previous deliveries for this order
    const previousDeliveries = await Delivery.find({
      shopOrder,
    }).session(session);

    // Validate each delivery item
    for (const item of items) {
      const orderItem = order.items.find(
        (orderItem) =>
          orderItem.product.toString() === item.product.toString()
      );

      if (!orderItem) {
        throw new Error(
          `Product ${item.product} does not exist in the shop order`
        );
      }

      // Calculate already delivered quantity
      let alreadyDelivered = 0;

      for (const delivery of previousDeliveries) {
        for (const deliveredItem of delivery.items) {
          if (
            deliveredItem.product.toString() === item.product.toString()
          ) {
            alreadyDelivered += deliveredItem.quantityDelivered;
          }
        }
      }

      const remainingQuantity =
        orderItem.quantity - alreadyDelivered;

      if (item.quantityDelivered > remainingQuantity) {
        throw new Error(
          `Cannot deliver ${item.quantityDelivered} kg of product ${item.product}. Only ${remainingQuantity} kg remaining.`
        );
      }

      if (item.quantityDelivered <= 0) {
        throw new Error(
          "Delivered quantity must be greater than 0"
        );
      }

      // Check available stock
      const currentStock = await getStockQuantity(item.product);

      if (item.quantityDelivered > currentStock) {
        throw new Error(
          `Insufficient stock for product ${item.product}. Available stock: ${currentStock} kg.`
        );
      }
    }

    // Create delivery
    const delivery = await Delivery.create(
      [
        {
          shopOrder,
          shop,
          items,
          deliveredAt,
          deliveryRun,
          notes,
        },
      ],
      { session }
    );

    const createdDelivery = delivery[0];

    // Create stock transactions
    for (const item of createdDelivery.items) {
      await createStockTransaction({
        product: item.product,
        type: "DELIVERY",
        quantity: item.quantityDelivered,
        referenceType: "Delivery",
        referenceId: createdDelivery._id,
        transactionDate: createdDelivery.deliveredAt,
        notes: `Stock delivered through delivery ${createdDelivery._id}`,
        session,
      });
    }

    // Update shop order status
    let allCompleted = true;
    let anyDelivered = false;

    for (const orderItem of order.items) {
      let totalDelivered = 0;

      for (const delivery of previousDeliveries) {
        for (const deliveredItem of delivery.items) {
          if (
            deliveredItem.product.toString() ===
            orderItem.product.toString()
          ) {
            totalDelivered += deliveredItem.quantityDelivered;
          }
        }
      }

      // Include current delivery
      for (const deliveredItem of createdDelivery.items) {
        if (
          deliveredItem.product.toString() ===
          orderItem.product.toString()
        ) {
          totalDelivered += deliveredItem.quantityDelivered;
        }
      }

      if (totalDelivered > 0) {
        anyDelivered = true;
      }

      if (totalDelivered < orderItem.quantity) {
        allCompleted = false;
      }
    }

    if (allCompleted) {
      order.status = "completed";
    } else if (anyDelivered) {
      order.status = "partial";
    } else {
      order.status = "pending";
    }

    await order.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      message: "Delivery created successfully",
      delivery: createdDelivery,
      shopOrderStatus: order.status,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create delivery error:", error);

    res.status(400).json({
      message: "Failed to create delivery",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate("shopOrder")
      .populate("shop")
      .populate("items.product")
      .populate("deliveryRun");

    res.status(200).json(deliveries);
  } catch (error) {
    console.error("Get deliveries error:", error);

    res.status(500).json({
      message: "Failed to fetch deliveries",
      error: error.message,
    });
  }
};

const assignDeliveryToRun = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { deliveryRun } = req.body;

    if (!deliveryRun) {
      return res.status(400).json({
        message: "Delivery run is required",
      });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        message: "Delivery not found",
      });
    }

    if (delivery.deliveryRun) {
      return res.status(400).json({
        message: "Delivery is already assigned to a delivery run",
      });
    }

    const run = await mongoose.model("DeliveryRun").findById(deliveryRun);

    if (!run) {
      return res.status(404).json({
        message: "Delivery run not found",
      });
    }

    if (["completed", "cancelled"].includes(run.status)) {
      return res.status(400).json({
        message: `Cannot assign delivery to a ${run.status} delivery run`,
      });
    }

    delivery.deliveryRun = run._id;

    await delivery.save();

    const updatedDelivery = await Delivery.findById(delivery._id)
      .populate("shopOrder")
      .populate("shop")
      .populate("items.product")
      .populate("deliveryRun");

    res.status(200).json({
      message: "Delivery assigned to delivery run successfully",
      delivery: updatedDelivery,
    });
  } catch (error) {
    console.error("Assign delivery to run error:", error);

    res.status(500).json({
      message: "Failed to assign delivery to delivery run",
      error: error.message,
    });
  }
};
module.exports = {
  createDelivery,
  getDeliveries,
  assignDeliveryToRun,
};