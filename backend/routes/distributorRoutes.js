const express = require("express");

const {
  getDistributors,
  createDistributor,
  updateDistributor,
  deleteDistributor,
} = require("../controllers/distributorController");

const router = express.Router();

router.get("/", getDistributors);
router.post("/", createDistributor);

router.put("/:id", updateDistributor);
router.delete("/:id", deleteDistributor);

module.exports = router;