const express = require("express");

const {
  createPayment,
} = require("../controllers/paymentController");

const router = express.Router();

// Create payment
router.post("/", createPayment);

module.exports = router;