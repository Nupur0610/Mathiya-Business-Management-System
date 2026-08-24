const express = require("express");

const {
  createDeliveryRun,
  getDeliveryRuns,
  getDeliveryRunById,
} = require("../controllers/deliveryRunController");

const router = express.Router();

router.post("/", createDeliveryRun);

router.get("/", getDeliveryRuns);

router.get("/:id", getDeliveryRunById);

module.exports = router;