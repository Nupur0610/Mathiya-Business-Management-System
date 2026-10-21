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


const { getShopOutstanding } = require("../services/outstandingService");

const updateShop = async (req, res) => {
  try {
    const { name, ownerName, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Shop name is required",
      });
    }

    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { name, ownerName, phone, address },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.status(200).json(shop);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update shop",
      error: error.message,
    });
  }
};

// Hides the shop (old records keep working). Needs zero outstanding.
const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const { outstanding } = await getShopOutstanding(shop._id);

    if (Math.abs(outstanding) > 0.005) {
      return res.status(400).json({
        message: `This shop still has an outstanding amount of ₹${outstanding}. Clear it (payment, return or correction) before deleting the shop.`,
      });
    }

    shop.isActive = false;
    await shop.save();

    res.status(200).json({ message: "Shop deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete shop",
      error: error.message,
    });
  }
};

module.exports = {
  getShops,
  createShop,
  updateShop,
  deleteShop,
};