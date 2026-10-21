const express = require("express");

const {
  createDelivery,
  getDeliveries,
  assignDeliveryToRun,
  updateDelivery,
  deleteDelivery,
} = require("../controllers/deliveryController");
const router = express.Router();

router.post("/", createDelivery);
router.get("/", getDeliveries);
router.patch("/:deliveryId/assign-run", assignDeliveryToRun);

router.put("/:id", updateDelivery);
router.delete("/:id", deleteDelivery);

module.exports = router;