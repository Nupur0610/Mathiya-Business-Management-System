const express = require("express");

const {
  getBusinessSummary,
} = require("../controllers/summaryController");

const router = express.Router();

router.get("/", getBusinessSummary);

module.exports = router;
