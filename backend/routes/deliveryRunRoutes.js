const express = require("express");

const {
  createDeliveryRun,
  getDeliveryRuns,
  getDeliveryRunById,
  updateDeliveryRunStatus,
} = require("../controllers/deliveryRunController");

const router = express.Router();

router.post("/", createDeliveryRun);

router.get("/", getDeliveryRuns);

router.get("/:id", getDeliveryRunById);

router.patch("/:id/status", updateDeliveryRunStatus);

module.exports = router;