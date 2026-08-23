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

module.exports = {
  createShopOrder,
  getShopOrders,
};