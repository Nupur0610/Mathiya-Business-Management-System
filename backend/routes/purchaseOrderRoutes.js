const express = require("express");

const {
  createPurchaseOrder,
  getPurchaseOrders,
} = require("../controllers/purchaseOrderController");

const router = express.Router();

router.get("/", getPurchaseOrders);
router.post("/", createPurchaseOrder);

module.exports = router;