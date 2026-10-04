const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const distributorRoutes = require("./routes/distributorRoutes");
const shopRoutes = require("./routes/shopRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const purchaseReceiptRoutes = require("./routes/purchaseReceiptRoutes");
const stockRoutes = require("./routes/stockRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const shopOrderRoutes = require("./routes/shopOrderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const outstandingRoutes = require("./routes/outstandingRoutes");
const cashTransactionRoutes = require("./routes/cashTransactionRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const dailyBalanceRoutes = require("./routes/dailyBalanceRoutes");
const openingBalanceRoutes = require("./routes/openingBalanceRoutes");
const returnRoutes = require("./routes/returnRoutes");
const stockAdjustmentRoutes = require("./routes/stockAdjustmentRoutes");
const deliveryRunRoutes = require("./routes/deliveryRunRoutes");
const reportRoutes = require("./routes/reportRoutes");
const purchasePriceRoutes = require("./routes/purchasePriceRoutes");
const authRoutes = require("./routes/authRoutes");
const { requireAuth } = require("./middleware/auth");

if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET) {
  console.error(
    "Missing APP_PASSWORD or AUTH_SECRET environment variable. Set both before starting."
  );
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Public: health check + login
app.get("/healthz", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);

// Everything else under /api needs a valid login token
app.use("/api", requireAuth);

app.use("/api/products", productRoutes);
app.use("/api/distributors", distributorRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/purchase-receipts", purchaseReceiptRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/shop-orders", shopOrderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/outstanding", outstandingRoutes);
app.use("/api/cash-transactions", cashTransactionRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/daily-balances", dailyBalanceRoutes);
app.use("/api/opening-balances", openingBalanceRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/stock-adjustments",stockAdjustmentRoutes);
app.use("/api/delivery-runs", deliveryRunRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/purchase-prices", purchasePriceRoutes);

// Serve the built frontend (production) so one service runs everything
const distPath = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      message: "Mathiya Business Management System API is running",
    });
  });
}

const PORT = process.env.PORT || 5000;
connectDB()
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});