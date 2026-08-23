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

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/products", productRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Mathiya Business Management System API is running",
  });
});
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

const PORT = process.env.PORT || 5000;
connectDB()
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});