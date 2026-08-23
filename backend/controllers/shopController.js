const Shop = require("../models/Shop");

const getShops = async (req, res) => {
  try {
    const shops = await Shop.find({ isActive: true }).sort({
      name: 1,
    });

    res.status(200).json(shops);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch shops",
      error: error.message,
    });
  }
};

const createShop = async (req, res) => {
  try {
    const { name, ownerName, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Shop name is required",
      });
    }

    const shop = await Shop.create({
      name,
      ownerName,
      phone,
      address,
    });

    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create shop",
      error: error.message,
    });
  }
};

module.exports = {
  getShops,
  createShop,
};