const express = require("express");

const {
  createStockAdjustment,
  getStockAdjustments,
  updateStockAdjustment,
  deleteStockAdjustment,
} = require("../controllers/stockAdjustmentController");

const router = express.Router();

router.post("/", createStockAdjustment);

router.get("/", getStockAdjustments);

router.put("/:id", updateStockAdjustment);
router.delete("/:id", deleteStockAdjustment);

module.exports = router;