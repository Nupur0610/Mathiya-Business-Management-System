const express = require("express");

const {
  createPayment,
  getPayments,
} = require("../controllers/paymentController");

const router = express.Router();

// Get all payments
router.get("/", getPayments);

// Create payment
router.post("/", createPayment);

module.exports = router;