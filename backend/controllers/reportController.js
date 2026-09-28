
const Delivery = require("../models/Delivery");
const PurchaseReceipt = require("../models/PurchaseReceipt");
const Return = require("../models/Return");
const Payment = require("../models/Payment");
const StockTransaction = require("../models/StockTransaction");
const Product = require("../models/Product");

// =====================================================
// SALES REPORT
// =====================================================

const getSalesReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const deliveryFilter = {};
    const returnFilter = {
      returnType: "from_shop",
    };

    if (from || to) {
      deliveryFilter.deliveredAt = {};
      returnFilter.returnDate = {};

      if (from) {
        deliveryFilter.deliveredAt.$gte = new Date(
          `${from}T00:00:00.000Z`
        );

        returnFilter.returnDate.$gte = new Date(
          `${from}T00:00:00.000Z`
        );
      }

      if (to) {
        deliveryFilter.deliveredAt.$lte = new Date(
          `${to}T23:59:59.999Z`
        );

        returnFilter.returnDate.$lte = new Date(
          `${to}T23:59:59.999Z`
        );
      }
    }

    const deliveries = await Delivery.find(deliveryFilter)
      .populate("shop")
      .populate("items.product")
      .sort({ deliveredAt: -1 });

    const returns = await Return.find(returnFilter)
      .populate("shop")
      .populate("items.product")
      .sort({ returnDate: -1 });

    let totalDeliveredQuantity = 0;
    let grossSales = 0;

    const shopSummary = {};
    const productSummary = {};

    for (const delivery of deliveries) {
      const shopId = delivery.shop?._id?.toString();
      const shopName = delivery.shop?.name || "Unknown Shop";

      if (!shopSummary[shopId]) {
        shopSummary[shopId] = {
          shopId,
          shopName,
          deliveredQuantity: 0,
          grossSales: 0,
          salesReturns: 0,
          netSales: 0,
        };
      }

      for (const item of delivery.items) {
        const quantity = item.quantityDelivered || 0;
        const price = item.pricePerKg || 0;
        const value = quantity * price;

        totalDeliveredQuantity += quantity;
        grossSales += value;

        shopSummary[shopId].deliveredQuantity += quantity;
        shopSummary[shopId].grossSales += value;

        const productId = item.product?._id?.toString();
        const productName =
          item.product?.name || "Unknown Product";
        const brand = item.product?.brand || "";

        if (!productSummary[productId]) {
          productSummary[productId] = {
            productId,
            productName,
            brand,
            deliveredQuantity: 0,
            grossSales: 0,
            salesReturns: 0,
            netSales: 0,
          };
        }

        productSummary[productId].deliveredQuantity += quantity;
        productSummary[productId].grossSales += value;
      }
    }

    let totalReturnedQuantity = 0;
    let totalSalesReturns = 0;

    for (const returnEntry of returns) {
      const shopId = returnEntry.shop?._id?.toString();
      const shopName =
        returnEntry.shop?.name || "Unknown Shop";

      if (!shopSummary[shopId]) {
        shopSummary[shopId] = {
          shopId,
          shopName,
          deliveredQuantity: 0,
          grossSales: 0,
          salesReturns: 0,
          netSales: 0,
        };
      }

      for (const item of returnEntry.items) {
        const quantity = item.quantity || 0;
        const price = item.pricePerKg || 0;
        const value = quantity * price;

        totalReturnedQuantity += quantity;
        totalSalesReturns += value;

        shopSummary[shopId].salesReturns += value;

        const productId = item.product?._id?.toString();
        const productName =
          item.product?.name || "Unknown Product";
        const brand = item.product?.brand || "";

        if (!productSummary[productId]) {
          productSummary[productId] = {
            productId,
            productName,
            brand,
            deliveredQuantity: 0,
            grossSales: 0,
            salesReturns: 0,
            netSales: 0,
          };
        }

        productSummary[productId].salesReturns += value;
      }
    }

    Object.values(shopSummary).forEach((shop) => {
      shop.netSales =
        shop.grossSales - shop.salesReturns;
    });

    Object.values(productSummary).forEach((product) => {
      product.netSales =
        product.grossSales - product.salesReturns;
    });

    const netSales =
      grossSales - totalSalesReturns;

    res.status(200).json({
      filters: {
        from: from || null,
        to: to || null,
      },

      summary: {
        totalDeliveries: deliveries.length,
        totalDeliveredQuantity,
        grossSales,
        totalReturnedQuantity,
        salesReturns: totalSalesReturns,
        netSales,
      },

      byShop: Object.values(shopSummary),
      byProduct: Object.values(productSummary),

      deliveries,
      salesReturns: returns,
    });
  } catch (error) {
    console.error("Get sales report error:", error);

    res.status(500).json({
      message: "Failed to generate sales report",
      error: error.message,
    });
  }
};

// =====================================================
// PURCHASE REPORT
// =====================================================

const getPurchaseReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const receiptFilter = {};
    const returnFilter = {
      returnType: "to_distributor",
    };

    if (from || to) {
      receiptFilter.receivedAt = {};
      returnFilter.returnDate = {};

      if (from) {
        receiptFilter.receivedAt.$gte = new Date(
          `${from}T00:00:00.000Z`
        );

        returnFilter.returnDate.$gte = new Date(
          `${from}T00:00:00.000Z`
        );
      }

      if (to) {
        receiptFilter.receivedAt.$lte = new Date(
          `${to}T23:59:59.999Z`
        );

        returnFilter.returnDate.$lte = new Date(
          `${to}T23:59:59.999Z`
        );
      }
    }

    const receipts = await PurchaseReceipt.find(
      receiptFilter
    )
      .populate("distributor")
      .populate("items.product")
      .sort({ receivedAt: -1 });

    const returns = await Return.find(returnFilter)
      .populate("distributor")
      .populate("items.product")
      .sort({ returnDate: -1 });

    let totalReceivedQuantity = 0;
    let grossPurchases = 0;

    const distributorSummary = {};
    const productSummary = {};

    for (const receipt of receipts) {
      const distributorId =
        receipt.distributor?._id?.toString();

      const distributorName =
        receipt.distributor?.name ||
        "Unknown Distributor";

      if (!distributorSummary[distributorId]) {
        distributorSummary[distributorId] = {
          distributorId,
          distributorName,
          receivedQuantity: 0,
          grossPurchases: 0,
          purchaseReturns: 0,
          netPurchases: 0,
        };
      }

      for (const item of receipt.items) {
        const quantity =
          item.quantityReceived || 0;

        const price =
          item.pricePerKg || 0;

        const value = quantity * price;

        totalReceivedQuantity += quantity;
        grossPurchases += value;

        distributorSummary[
          distributorId
        ].receivedQuantity += quantity;

        distributorSummary[
          distributorId
        ].grossPurchases += value;

        const productId =
          item.product?._id?.toString();

        const productName =
          item.product?.name ||
          "Unknown Product";

        const brand =
          item.product?.brand || "";

        if (!productSummary[productId]) {
          productSummary[productId] = {
            productId,
            productName,
            brand,
            receivedQuantity: 0,
            grossPurchases: 0,
            purchaseReturns: 0,
            netPurchases: 0,
          };
        }

        productSummary[
          productId
        ].receivedQuantity += quantity;

        productSummary[
          productId
        ].grossPurchases += value;
      }
    }

    let totalReturnedQuantity = 0;
    let totalPurchaseReturns = 0;

    for (const returnEntry of returns) {
      const distributorId =
        returnEntry.distributor?._id?.toString();

      const distributorName =
        returnEntry.distributor?.name ||
        "Unknown Distributor";

      if (!distributorSummary[distributorId]) {
        distributorSummary[distributorId] = {
          distributorId,
          distributorName,
          receivedQuantity: 0,
          grossPurchases: 0,
          purchaseReturns: 0,
          netPurchases: 0,
        };
      }

      for (const item of returnEntry.items) {
        const quantity =
          item.quantity || 0;

        const price =
          item.pricePerKg || 0;

        const value = quantity * price;

        totalReturnedQuantity += quantity;
        totalPurchaseReturns += value;

        distributorSummary[
          distributorId
        ].purchaseReturns += value;

        const productId =
          item.product?._id?.toString();

        const productName =
          item.product?.name ||
          "Unknown Product";

        const brand =
          item.product?.brand || "";

        if (!productSummary[productId]) {
          productSummary[productId] = {
            productId,
            productName,
            brand,
            receivedQuantity: 0,
            grossPurchases: 0,
            purchaseReturns: 0,
            netPurchases: 0,
          };
        }

        productSummary[
          productId
        ].purchaseReturns += value;
      }
    }

    Object.values(distributorSummary).forEach(
      (distributor) => {
        distributor.netPurchases =
          distributor.grossPurchases -
          distributor.purchaseReturns;
      }
    );

    Object.values(productSummary).forEach(
      (product) => {
        product.netPurchases =
          product.grossPurchases -
          product.purchaseReturns;
      }
    );

    const netPurchases =
      grossPurchases -
      totalPurchaseReturns;

    res.status(200).json({
      filters: {
        from: from || null,
        to: to || null,
      },

      summary: {
        totalReceipts: receipts.length,
        totalReceivedQuantity,
        grossPurchases,
        totalReturnedQuantity,
        purchaseReturns:
          totalPurchaseReturns,
        netPurchases,
      },

      byDistributor:
        Object.values(distributorSummary),

      byProduct:
        Object.values(productSummary),

      receipts,
      purchaseReturns: returns,
    });
  } catch (error) {
    console.error(
      "Get purchase report error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to generate purchase report",
      error: error.message,
    });
  }
};

// =====================================================
// PAYMENT REPORT
// =====================================================

const getPaymentReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const filter = {};

    if (from || to) {
      filter.paymentDate = {};

      if (from) {
        filter.paymentDate.$gte = new Date(
          `${from}T00:00:00.000Z`
        );
      }

      if (to) {
        filter.paymentDate.$lte = new Date(
          `${to}T23:59:59.999Z`
        );
      }
    }

    const payments = await Payment.find(filter)
      .populate("shop")
      .populate("distributor")
      .sort({ paymentDate: -1 });

    let totalPayments = 0;
    let shopPayments = 0;
    let distributorPayments = 0;

    let cashReceived = 0;
    let gpayReceived = 0;

    let cashPaid = 0;
    let gpayPaid = 0;

    const shopSummary = {};
    const distributorSummary = {};
    const dayWise = {};

    for (const payment of payments) {
      const amount = Number(payment.amount || 0);

      totalPayments += amount;

      const paymentDate = new Date(
        payment.paymentDate || payment.createdAt
      );

      const dateKey = paymentDate
        .toISOString()
        .split("T")[0];

      if (!dayWise[dateKey]) {
        dayWise[dateKey] = {
          date: dateKey,
          shopPayments: 0,
          distributorPayments: 0,
          cashReceived: 0,
          gpayReceived: 0,
          cashPaid: 0,
          gpayPaid: 0,
          profitLoss: 0,
        };
      }

      if (payment.partyType === "shop") {
        shopPayments += amount;
        dayWise[dateKey].shopPayments += amount;

        if (payment.paymentMethod === "cash") {
          cashReceived += amount;
          dayWise[dateKey].cashReceived += amount;
        }

        if (payment.paymentMethod === "gpay") {
          gpayReceived += amount;
          dayWise[dateKey].gpayReceived += amount;
        }

        const shopId =
          payment.shop?._id?.toString();

        const shopName =
          payment.shop?.name ||
          "Unknown Shop";

        if (!shopSummary[shopId]) {
          shopSummary[shopId] = {
            shopId,
            shopName,
            totalPayments: 0,
            cash: 0,
            gpay: 0,
          };
        }

        shopSummary[shopId].totalPayments +=
          amount;

        if (payment.paymentMethod === "cash") {
          shopSummary[shopId].cash += amount;
        }

        if (payment.paymentMethod === "gpay") {
          shopSummary[shopId].gpay += amount;
        }
      }

      if (payment.partyType === "distributor") {
        distributorPayments += amount;
        dayWise[dateKey].distributorPayments += amount;

        if (payment.paymentMethod === "cash") {
          cashPaid += amount;
          dayWise[dateKey].cashPaid += amount;
        }

        if (payment.paymentMethod === "gpay") {
          gpayPaid += amount;
          dayWise[dateKey].gpayPaid += amount;
        }

        const distributorId =
          payment.distributor?._id?.toString();

        const distributorName =
          payment.distributor?.name ||
          "Unknown Distributor";

        if (!distributorSummary[distributorId]) {
          distributorSummary[distributorId] = {
            distributorId,
            distributorName,
            totalPayments: 0,
            cash: 0,
            gpay: 0,
          };
        }

        distributorSummary[
          distributorId
        ].totalPayments += amount;

        if (payment.paymentMethod === "cash") {
          distributorSummary[
            distributorId
          ].cash += amount;
        }

        if (payment.paymentMethod === "gpay") {
          distributorSummary[
            distributorId
          ].gpay += amount;
        }
      }
    }

    Object.values(dayWise).forEach((day) => {
      day.profitLoss =
        day.shopPayments -
        day.distributorPayments;
    });

    const profitLoss =
      shopPayments -
      distributorPayments;

    res.status(200).json({
      filters: {
        from: from || null,
        to: to || null,
      },

      summary: {
        totalPayments,
        shopPayments,
        distributorPayments,
        profitLoss,
        cashReceived,
        gpayReceived,
        cashPaid,
        gpayPaid,
      },

      byShop:
        Object.values(shopSummary),

      byDistributor:
        Object.values(distributorSummary),

      dayWise: Object.values(dayWise).sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      ),

      payments,
    });
  } catch (error) {
    console.error(
      "Get payment report error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to generate payment report",
      error: error.message,
    });
  }
};

// =====================================================
// STOCK REPORT
// =====================================================

const getStockReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const filter = {};

    if (from || to) {
      filter.transactionDate = {};

      if (from) {
        filter.transactionDate.$gte = new Date(
          `${from}T00:00:00.000Z`
        );
      }

      if (to) {
        filter.transactionDate.$lte = new Date(
          `${to}T23:59:59.999Z`
        );
      }
    }

    const transactions = await StockTransaction.find(filter)
      .populate("product")
      .sort({ transactionDate: -1 });

    const products = await Product.find({
      isActive: true,
    });

    const productSummary = {};

    for (const product of products) {
      const productId = product._id.toString();

      productSummary[productId] = {
        productId,
        productName: product.name,
        brand: product.brand,
        unit: product.unit,
        purchaseQuantity: 0,
        salesQuantity: 0,
        salesReturnQuantity: 0,
        purchaseReturnQuantity: 0,
        adjustmentInQuantity: 0,
        adjustmentOutQuantity: 0,
        netMovement: 0,
        currentStock: 0,
      };
    }

    let purchaseQuantity = 0;
    let salesQuantity = 0;
    let salesReturnQuantity = 0;
    let purchaseReturnQuantity = 0;
    let adjustmentInQuantity = 0;
    let adjustmentOutQuantity = 0;

    const dayWise = {};

    const getDay = (date) => {
      return new Date(date)
        .toISOString()
        .split("T")[0];
    };

    for (const transaction of transactions) {
      const productId =
        transaction.product?._id?.toString();

      if (!productId) {
        continue;
      }

      if (!productSummary[productId]) {
        productSummary[productId] = {
          productId,
          productName:
            transaction.product?.name ||
            "Unknown Product",
          brand:
            transaction.product?.brand || "",
          unit:
            transaction.product?.unit || "kg",
          purchaseQuantity: 0,
          salesQuantity: 0,
          salesReturnQuantity: 0,
          purchaseReturnQuantity: 0,
          adjustmentInQuantity: 0,
          adjustmentOutQuantity: 0,
          netMovement: 0,
          currentStock: 0,
        };
      }

      const quantity = Number(
        transaction.quantity || 0
      );

      const dateKey = getDay(
        transaction.transactionDate
      );

      if (!dayWise[dateKey]) {
        dayWise[dateKey] = {
          date: dateKey,
          purchaseQuantity: 0,
          salesQuantity: 0,
          salesReturnQuantity: 0,
          purchaseReturnQuantity: 0,
          adjustmentInQuantity: 0,
          adjustmentOutQuantity: 0,
          netMovement: 0,
        };
      }

      switch (transaction.type) {
        case "PURCHASE_RECEIPT":
          purchaseQuantity += quantity;
          productSummary[
            productId
          ].purchaseQuantity += quantity;
          dayWise[dateKey].purchaseQuantity += quantity;
          break;

        case "DELIVERY":
          salesQuantity += quantity;
          productSummary[
            productId
          ].salesQuantity += quantity;
          dayWise[dateKey].salesQuantity += quantity;
          break;

        case "SALES_RETURN":
          salesReturnQuantity += quantity;
          productSummary[
            productId
          ].salesReturnQuantity += quantity;
          dayWise[dateKey].salesReturnQuantity += quantity;
          break;

        case "PURCHASE_RETURN":
          purchaseReturnQuantity += quantity;
          productSummary[
            productId
          ].purchaseReturnQuantity += quantity;
          dayWise[dateKey].purchaseReturnQuantity += quantity;
          break;

        case "ADJUSTMENT_IN":
          adjustmentInQuantity += quantity;
          productSummary[
            productId
          ].adjustmentInQuantity += quantity;
          dayWise[dateKey].adjustmentInQuantity += quantity;
          break;

        case "ADJUSTMENT_OUT":
          adjustmentOutQuantity += quantity;
          productSummary[
            productId
          ].adjustmentOutQuantity += quantity;
          dayWise[dateKey].adjustmentOutQuantity += quantity;
          break;
      }
    }

    Object.values(productSummary).forEach((product) => {
      product.netMovement =
        product.purchaseQuantity +
        product.salesReturnQuantity +
        product.adjustmentInQuantity -
        product.salesQuantity -
        product.purchaseReturnQuantity -
        product.adjustmentOutQuantity;
    });

    Object.values(dayWise).forEach((day) => {
      day.netMovement =
        day.purchaseQuantity +
        day.salesReturnQuantity +
        day.adjustmentInQuantity -
        day.salesQuantity -
        day.purchaseReturnQuantity -
        day.adjustmentOutQuantity;
    });

    const allTransactions = await StockTransaction.find();

    const currentStockByProduct = {};

    for (const transaction of allTransactions) {
      const productId =
        transaction.product?.toString();

      if (!productId) {
        continue;
      }

      if (!currentStockByProduct[productId]) {
        currentStockByProduct[productId] = 0;
      }

      const quantity = Number(
        transaction.quantity || 0
      );

      if (
        transaction.type === "PURCHASE_RECEIPT" ||
        transaction.type === "SALES_RETURN" ||
        transaction.type === "ADJUSTMENT_IN"
      ) {
        currentStockByProduct[productId] += quantity;
      }

      if (
        transaction.type === "DELIVERY" ||
        transaction.type === "PURCHASE_RETURN" ||
        transaction.type === "ADJUSTMENT_OUT"
      ) {
        currentStockByProduct[productId] -= quantity;
      }
    }

    let currentStock = 0;

    Object.values(productSummary).forEach((product) => {
      const stock =
        currentStockByProduct[product.productId] || 0;

      product.currentStock = stock;
      currentStock += stock;
    });

    const netMovement =
      purchaseQuantity +
      salesReturnQuantity +
      adjustmentInQuantity -
      salesQuantity -
      purchaseReturnQuantity -
      adjustmentOutQuantity;

    const soldQuantity = salesQuantity;

    res.status(200).json({
      filters: {
        from: from || null,
        to: to || null,
      },

      summary: {
        purchaseQuantity,
        salesQuantity,
        soldQuantity,
        salesReturnQuantity,
        purchaseReturnQuantity,
        adjustmentInQuantity,
        adjustmentOutQuantity,
        netMovement,
        currentStock,
      },

      byProduct:
        Object.values(productSummary),

      dayWise: Object.values(dayWise).sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      ),

      transactions,
    });
  } catch (error) {
    console.error(
      "Get stock report error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to generate stock report",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getPaymentReport,
  getStockReport,
};

