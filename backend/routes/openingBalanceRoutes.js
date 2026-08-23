const express = require("express");

const {
  createOpeningBalance,
  getOpeningBalances,
} = require("../controllers/openingBalanceController");

const router = express.Router();

router.post("/", createOpeningBalance);
router.get("/", getOpeningBalances);

module.exports = router;