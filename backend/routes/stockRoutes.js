const express = require("express");

const { getCurrentStock } = require("../controllers/stockController");

const router = express.Router();

router.get("/", getCurrentStock);

module.exports = router;