const express = require("express");

const {
  getSalesReport,
  getPurchaseReport,
  getPaymentReport,
  getStockReport,
} = require("../controllers/reportController");

const router = express.Router();

router.get("/sales", getSalesReport);
router.get("/purchases", getPurchaseReport);
router.get("/payments", getPaymentReport);
router.get("/stock", getStockReport);

module.exports = router;