const express = require("express");

const {
  createShopOrder,
  getShopOrders,
  updateShopOrder,
  deleteShopOrder,
} = require("../controllers/shopOrderController");

const router = express.Router();

router.post("/", createShopOrder);
router.get("/", getShopOrders);

router.put("/:id", updateShopOrder);
router.delete("/:id", deleteShopOrder);

module.exports = router;