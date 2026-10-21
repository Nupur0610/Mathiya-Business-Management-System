const express = require("express");

const {
  createReturn,
  getReturns,
  updateReturn,
  deleteReturn,
} = require("../controllers/returnController");

const router = express.Router();

router.post("/", createReturn);
router.get("/", getReturns);

router.put("/:id", updateReturn);
router.delete("/:id", deleteReturn);

module.exports = router;