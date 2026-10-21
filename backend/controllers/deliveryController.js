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

const {
  deleteStockTransactionsByReference,
  assertStockNotNegative,
} = require("../services/stockService");
const {
  computeOrderStatus,
  sumByProduct,
} = require("../services/orderStatus");
const { assertShopReturnsValid } = require("../services/integrityService");

const recomputeShopOrderStatus = async (orderId, session) => {
  const order = await ShopOrder.findById(orderId).session(session);

  if (!order) {
    return;
  }

  const deliveries = await Delivery.find({ shopOrder: orderId }).session(
    session
  );

  order.status = computeOrderStatus(
    order.items,
    deliveries.flatMap((d) => d.items),
    "quantityDelivered",
    order.status
  );

  await order.save({ session });
};

const updateDelivery = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { items, deliveredAt, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Delivery must contain at least one item");
    }

    for (const item of items) {
      if (!item.product) {
        throw new Error("Product is required for every item");
      }

      if (!(Number(item.quantityDelivered) > 0)) {
        throw new Error("Delivered quantity must be greater than 0");
      }

      if (
        item.pricePerKg === undefined ||
        !(Number(item.pricePerKg) >= 0)
      ) {
        throw new Error("A valid price per kg is required for every item");
      }
    }

    session.startTransaction();

    const delivery = await Delivery.findById(req.params.id).session(
      session
    );

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    const order = await ShopOrder.findById(delivery.shopOrder).session(
      session
    );

    if (!order) {
      throw new Error("Shop order not found");
    }

    const otherDeliveries = await Delivery.find({
      shopOrder: delivery.shopOrder,
      _id: { $ne: delivery._id },
    }).session(session);

    const orderedTotals = sumByProduct(order.items, "quantity");
    const alreadyDelivered = sumByProduct(
      otherDeliveries.flatMap((d) => d.items),
      "quantityDelivered"
    );
    const newTotals = sumByProduct(items, "quantityDelivered");

    for (const [productId, qty] of Object.entries(newTotals)) {
      if (orderedTotals[productId] === undefined) {
        throw new Error("A product in this delivery is not in the shop order");
      }

      const remaining =
        orderedTotals[productId] - (alreadyDelivered[productId] || 0);

      if (qty > remaining + 0.0001) {
        throw new Error(
          `Cannot deliver ${qty} kg. Only ${remaining} kg of this product is left on the order.`
        );
      }
    }

    const oldProducts = delivery.items.map((item) => item.product);

    delivery.items = items.map((item) => ({
      product: item.product,
      quantityDelivered: Number(item.quantityDelivered),
      pricePerKg: Number(item.pricePerKg),
    }));
    if (deliveredAt) delivery.deliveredAt = deliveredAt;
    delivery.notes = notes;

    await delivery.save({ session });

    await deleteStockTransactionsByReference(
      "Delivery",
      delivery._id,
      session
    );

    for (const item of delivery.items) {
      await createStockTransaction({
        product: item.product,
        type: "DELIVERY",
        quantity: item.quantityDelivered,
        referenceType: "Delivery",
        referenceId: delivery._id,
        transactionDate: delivery.deliveredAt,
        notes: `Stock delivered through delivery ${delivery._id}`,
        session,
      });
    }

    await assertStockNotNegative(
      [...oldProducts, ...delivery.items.map((item) => item.product)],
      session
    );

    await assertShopReturnsValid(delivery.shop, session);

    await recomputeShopOrderStatus(order._id, session);

    await session.commitTransaction();

    const populated = await Delivery.findById(delivery._id)
      .populate("shopOrder")
      .populate("shop")
      .populate("items.product")
      .populate("deliveryRun");

    res.status(200).json({
      message: "Delivery updated successfully",
      delivery: populated,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Update delivery error:", error);

    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

const deleteDelivery = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const delivery = await Delivery.findById(req.params.id).session(
      session
    );

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    await deleteStockTransactionsByReference(
      "Delivery",
      delivery._id,
      session
    );

    await Delivery.deleteOne({ _id: delivery._id }, { session });

    await assertShopReturnsValid(delivery.shop, session);

    await recomputeShopOrderStatus(delivery.shopOrder, session);

    await session.commitTransaction();

    res.status(200).json({ message: "Delivery deleted successfully" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Delete delivery error:", error);

    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createDelivery,
  getDeliveries,
  assignDeliveryToRun,
  updateDelivery,
  deleteDelivery,
};