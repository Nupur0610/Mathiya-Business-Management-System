const express = require("express");

const {
  createShopOrder,
  getShopOrders,
} = require("../controllers/shopOrderController");

const router = express.Router();

router.post("/", createShopOrder);
router.get("/", getShopOrders);

module.exports = router;