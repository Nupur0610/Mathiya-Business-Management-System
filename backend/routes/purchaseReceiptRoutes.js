const express = require("express");

const {
  createPurchaseReceipt,
  getPurchaseReceipts,
  updatePurchaseReceipt,
  deletePurchaseReceipt,
} = require("../controllers/purchaseReceiptController");

const router = express.Router();

router.get("/", getPurchaseReceipts);

router.post("/", createPurchaseReceipt);

router.put("/:id", updatePurchaseReceipt);
router.delete("/:id", deletePurchaseReceipt);

module.exports = router;