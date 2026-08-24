const express = require("express");

const {
  createDelivery,
  getDeliveries,
  assignDeliveryToRun,
} = require("../controllers/deliveryController");
const router = express.Router();

router.post("/", createDelivery);
router.get("/", getDeliveries);
router.patch("/:deliveryId/assign-run", assignDeliveryToRun);

module.exports = router;