const express = require("express");

const {
  createCashTransaction,
  getCashTransactions,
} = require("../controllers/cashTransactionController");

const router = express.Router();

// Create personal transaction
router.post("/", createCashTransaction);

// Get transaction history
router.get("/", getCashTransactions);

module.exports = router;