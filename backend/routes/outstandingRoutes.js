const express = require("express");

const {
  getShopOutstandingController,
  getDistributorOutstandingController,
} = require("../controllers/outstandingController");

const router = express.Router();

// Shop outstanding
router.get("/shops/:shopId", getShopOutstandingController);

// Distributor outstanding
router.get(
  "/distributors/:distributorId",
  getDistributorOutstandingController
);

module.exports = router;