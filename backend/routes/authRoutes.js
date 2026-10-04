const express = require("express");
const { createToken, safeEqual } = require("../middleware/auth");

const router = express.Router();

// Simple brute-force protection: 10 wrong attempts per IP per 15 minutes
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

router.post("/login", (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const record = attempts.get(ip);

  if (record && now - record.first < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    return res
      .status(429)
      .json({ message: "Too many attempts. Try again in 15 minutes." });
  }

  const password = (req.body && req.body.password) || "";

  if (safeEqual(password, process.env.APP_PASSWORD)) {
    attempts.delete(ip);
    return res.json({ token: createToken() });
  }

  if (!record || now - record.first >= WINDOW_MS) {
    attempts.set(ip, { first: now, count: 1 });
  } else {
    record.count += 1;
  }
  return res.status(401).json({ message: "Wrong password" });
});

module.exports = router;
