const express = require("express");

const {
  createCashTransaction,
  getCashTransactions,
  updateCashTransaction,
  deleteCashTransaction,
} = require("../controllers/cashTransactionController");

const router = express.Router();

// Create personal transaction
router.post("/", createCashTransaction);

// Get transaction history
router.get("/", getCashTransactions);

router.put("/:id", updateCashTransaction);
router.delete("/:id", deleteCashTransaction);

module.exports = router;