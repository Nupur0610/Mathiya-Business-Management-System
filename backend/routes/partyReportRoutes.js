const express = require("express");

const {
  getShopReport,
  getDistributorReport,
} = require("../controllers/partyReportController");

const router = express.Router();

router.get("/shop/:id", getShopReport);
router.get("/distributor/:id", getDistributorReport);

module.exports = router;
