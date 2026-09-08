const express = require("express");

const {
  createPurchaseReceipt,
  getPurchaseReceipts,
} = require("../controllers/purchaseReceiptController");

const router = express.Router();

router.get("/", getPurchaseReceipts);

router.post("/", createPurchaseReceipt);

module.exports = router;