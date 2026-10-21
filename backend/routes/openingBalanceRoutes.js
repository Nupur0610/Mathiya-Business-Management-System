const express = require("express");

const {
  createOpeningBalance,
  getOpeningBalances,
  updateOpeningBalance,
  deleteOpeningBalance,
} = require("../controllers/openingBalanceController");

const router = express.Router();

router.post("/", createOpeningBalance);
router.get("/", getOpeningBalances);

router.put("/:id", updateOpeningBalance);
router.delete("/:id", deleteOpeningBalance);

module.exports = router;