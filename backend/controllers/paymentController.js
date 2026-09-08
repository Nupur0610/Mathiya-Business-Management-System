const Payment = require("../models/Payment");
const Shop = require("../models/Shop");
const Distributor = require("../models/Distributor");

// Create a payment
const createPayment = async (req, res) => {
  try {
    const {
      partyType,
      shop,
      distributor,
      amount,
      paymentMethod,
      paymentDate,
      reference,
      notes,
    } = req.body;

    // Basic validation
    if (!partyType || !amount || !paymentMethod) {
      return res.status(400).json({
        message:
          "partyType, amount and paymentMethod are required.",
      });
    }

    // Shop payment validation
    if (partyType === "shop") {
      if (!shop) {
        return res.status(400).json({
          message: "Shop is required for a shop payment.",
        });
      }

      const existingShop = await Shop.findById(shop);

      if (!existingShop) {
        return res.status(404).json({
          message: "Shop not found.",
        });
      }
    }

    // Distributor payment validation
    if (partyType === "distributor") {
      if (!distributor) {
        return res.status(400).json({
          message:
            "Distributor is required for a distributor payment.",
        });
      }

      const existingDistributor =
        await Distributor.findById(distributor);

      if (!existingDistributor) {
        return res.status(404).json({
          message: "Distributor not found.",
        });
      }
    }

    // Create payment
    const payment = await Payment.create({
      partyType,
      shop: partyType === "shop" ? shop : undefined,
      distributor:
        partyType === "distributor"
          ? distributor
          : undefined,
      amount,
      paymentMethod,
      paymentDate,
      reference,
      notes,
    });

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate("shop")
        .populate("distributor");

    res.status(201).json(populatedPayment);
  } catch (error) {
    console.error("Create payment error:", error);

    res.status(500).json({
      message: "Failed to create payment.",
      error: error.message,
    });
  }
};

// Get all payments
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("shop")
      .populate("distributor")
      .sort({ paymentDate: -1 });

    res.status(200).json(payments);
  } catch (error) {
    console.error("Get payments error:", error);

    res.status(500).json({
      message: "Failed to fetch payments.",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
};