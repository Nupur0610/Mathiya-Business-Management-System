const express = require("express");

const {
  getShops,
  createShop,
  updateShop,
  deleteShop,
} = require("../controllers/shopController");

const router = express.Router();

router.get("/", getShops);
router.post("/", createShop);

router.put("/:id", updateShop);
router.delete("/:id", deleteShop);

module.exports = router;