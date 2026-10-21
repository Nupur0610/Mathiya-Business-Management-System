const ShopOrder = require("../models/ShopOrder");

const createShopOrder = async (req, res) => {
  try {
    const { shop, items, orderDate, notes } = req.body;

    if (!shop) {
      return res.status(400).json({
        message: "Shop is required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Shop order must contain at least one item",
      });
    }

    const order = await ShopOrder.create({
      shop,
      items,
      orderDate,
      notes,
    });

    const populatedOrder = await ShopOrder.findById(order._id)
      .populate("shop")
      .populate("items.product");

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error("Create shop order error:", error);

    res.status(500).json({
      message: "Failed to create shop order",
      error: error.message,
    });
  }
};

const getShopOrders = async (req, res) => {
  try {
    const orders = await ShopOrder.find()
      .populate("shop")
      .populate("items.product");

    res.status(200).json(orders);
  } catch (error) {
    console.error("Get shop orders error:", error);

    res.status(500).json({
      message: "Failed to fetch shop orders",
      error: error.message,
    });
  }
};


const Delivery = require("../models/Delivery");
const {
  computeOrderStatus,
  sumByProduct,
} = require("../services/orderStatus");

const checkOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Shop order must contain at least one item");
  }

  for (const item of items) {
    if (!item.product) {
      throw new Error("Product is required for every item");
    }

    if (!(Number(item.quantity) > 0)) {
      throw new Error("Quantity must be greater than 0");
    }

    if (item.pricePerKg === undefined || !(Number(item.pricePerKg) >= 0)) {
      throw new Error("A valid price per kg is required for every item");
    }
  }
};

const updateShopOrder = async (req, res) => {
  try {
    const { shop, items, orderDate, notes } = req.body;

    checkOrderItems(items);

    const order = await ShopOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Shop order not found" });
    }

    const deliveries = await Delivery.find({ shopOrder: order._id });

    if (deliveries.length > 0) {
      if (shop && String(shop) !== String(order.shop)) {
        throw new Error(
          "The shop cannot be changed because deliveries already exist for this order."
        );
      }

      const delivered = sumByProduct(
        deliveries.flatMap((d) => d.items),
        "quantityDelivered"
      );
      const ordered = sumByProduct(items, "quantity");

      for (const [productId, qty] of Object.entries(delivered)) {
        if ((ordered[productId] || 0) + 0.0001 < qty) {
          throw new Error(
            `Ordered quantity cannot be less than what is already delivered (${qty} kg). Edit the delivery first.`
          );
        }
      }
    }

    order.shop = shop || order.shop;
    order.items = items.map((item) => ({
      product: item.product,
      quantity: Number(item.quantity),
      pricePerKg: Number(item.pricePerKg),
    }));
    if (orderDate) order.orderDate = orderDate;
    order.notes = notes;

    order.status = computeOrderStatus(
      order.items,
      deliveries.flatMap((d) => d.items),
      "quantityDelivered",
      order.status
    );

    await order.save();

    const populated = await ShopOrder.findById(order._id)
      .populate("shop")
      .populate("items.product");

    res.status(200).json(populated);
  } catch (error) {
    console.error("Update shop order error:", error);

    res.status(400).json({ message: error.message });
  }
};

const deleteShopOrder = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Shop order not found" });
    }

    const deliveryCount = await Delivery.countDocuments({
      shopOrder: order._id,
    });

    if (deliveryCount > 0) {
      return res.status(400).json({
        message: `This order has ${deliveryCount} delivery record(s). Delete those deliveries first, then delete the order.`,
      });
    }

    await ShopOrder.deleteOne({ _id: order._id });

    res.status(200).json({ message: "Shop order deleted" });
  } catch (error) {
    console.error("Delete shop order error:", error);

    res.status(500).json({
      message: "Failed to delete shop order",
      error: error.message,
    });
  }
};

module.exports = {
  createShopOrder,
  getShopOrders,
  updateShopOrder,
  deleteShopOrder,
};