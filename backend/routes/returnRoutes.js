const express = require("express");

const {
  createReturn,
  getReturns,
} = require("../controllers/returnController");

const router = express.Router();

router.post("/", createReturn);
router.get("/", getReturns);

module.exports = router;