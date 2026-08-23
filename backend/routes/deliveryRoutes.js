const express = require("express");

const {
  createDelivery,
  getDeliveries,
} = require("../controllers/deliveryController");

const router = express.Router();

router.post("/", createDelivery);
router.get("/", getDeliveries);

module.exports = router;