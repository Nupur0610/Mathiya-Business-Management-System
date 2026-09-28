const express = require("express");

const {
  createOrUpdatePurchasePrice,
  getPurchasePrice,
  getPurchasePrices,
} = require("../controllers/purchasePriceController");

const router = express.Router();

router.get("/", getPurchasePrices);

router.get(
  "/:distributorId/:productId",
  getPurchasePrice
);

router.post(
  "/",
  createOrUpdatePurchasePrice
);

module.exports = router;