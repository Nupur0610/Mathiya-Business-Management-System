const express = require("express");

const {
  getDistributors,
  createDistributor,
} = require("../controllers/distributorController");

const router = express.Router();

router.get("/", getDistributors);
router.post("/", createDistributor);

module.exports = router;