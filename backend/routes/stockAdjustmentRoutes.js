const express = require("express");

const {
  createStockAdjustment,
  getStockAdjustments,
} = require("../controllers/stockAdjustmentController");

const router = express.Router();

router.post("/", createStockAdjustment);

router.get("/", getStockAdjustments);

module.exports = router;