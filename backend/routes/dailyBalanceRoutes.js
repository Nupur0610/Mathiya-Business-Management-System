const express = require("express");

const {
  saveDailyBalance,
  getDailyBalance,
  getDailyBalances,
} = require("../controllers/dailyBalanceController");

const router = express.Router();

// Create / update daily balance
router.post("/", saveDailyBalance);

// Get daily balance by date
router.get("/:date", getDailyBalance);

// Get daily balance history
router.get("/", getDailyBalances);

module.exports = router;