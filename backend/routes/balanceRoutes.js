const express = require("express");

const {
  getCashBalance,
  getGPayBalance,
  getBalances,
} = require("../controllers/balanceController");

const router = express.Router();

// Cash balance
router.get("/cash", getCashBalance);

// GPay balance
router.get("/gpay", getGPayBalance);

// Cash + GPay balance
router.get("/", getBalances);

module.exports = router;