const crypto = require("crypto");

const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const sign = (value) =>
  crypto
    .createHmac("sha256", process.env.AUTH_SECRET)
    .update(String(value))
    .digest("hex");

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const createToken = () => {
  const expires = Date.now() + TOKEN_LIFETIME_MS;
  return `${expires}.${sign(expires)}`;
};

const verifyToken = (token) => {
  if (!token || typeof token !== "string") return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
};

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (verifyToken(token)) return next();
  return res.status(401).json({ message: "Please log in" });
};

module.exports = { requireAuth, createToken, safeEqual };
