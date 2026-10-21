const express = require("express");

const {
  createPayment,
  getPayments,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");

const router = express.Router();

// Get all payments
router.get("/", getPayments);

// Create payment
router.post("/", createPayment);

router.put("/:id", updatePayment);
router.delete("/:id", deletePayment);

module.exports = router;