const express = require("express");

const {
  saveDailyBalance,
  getDailyBalance,
  getDailyBalances,
  deleteDailyBalance,
} = require("../controllers/dailyBalanceController");

const router = express.Router();

// Create / update daily balance
router.post("/", saveDailyBalance);

// Get daily balance by date
router.get("/:date", getDailyBalance);

// Get daily balance history
router.get("/", getDailyBalances);

// Delete a daily balance record
router.delete("/:id", deleteDailyBalance);

module.exports = router;