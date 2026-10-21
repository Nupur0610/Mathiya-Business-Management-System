const Delivery = require("../models/Delivery");
const PurchaseReceipt = require("../models/PurchaseReceipt");
const Return = require("../models/Return");
const Payment = require("../models/Payment");
const Shop = require("../models/Shop");
const Distributor = require("../models/Distributor");
const Product = require("../models/Product");
const PurchasePrice = require("../models/PurchasePrice");

const {
  getShopOutstanding,
  getDistributorOutstanding,
} = require("../services/outstandingService");

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// "2026-10-04" -> start / end of that day in India time
const startOfDay = (value) => new Date(`${value}T00:00:00.000+05:30`);
const endOfDay = (value) => new Date(`${value}T23:59:59.999+05:30`);

const monthKey = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(date));

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;

  return `${year}-${month}`;
};

const rangeFilter = (field, from, to) => {
  const filter = {};

  if (from) {
    filter.$gte = startOfDay(from);
  }

  if (to) {
    filter.$lte = endOfDay(to);
  }

  return Object.keys(filter).length ? { [field]: filter } : {};
};

/*
  Business summary
    - overall sale and purchase totals
    - sale per shop, purchase per distributor
    - estimated profit per product and per month

  Sale      = delivered value - sales returns
  Purchase  = received value  - purchase returns
  Profit    = sale value - (kg sold x average buying price per kg)
              (average buying price = all purchases / all kg received,
               after purchase returns)
*/
const getBusinessSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    const [
      deliveries,
      shopReturns,
      receipts,
      distributorReturns,
      shopPayments,
      distributorPayments,
      allReceipts,
      allDistributorReturns,
      shops,
      distributors,
      products,
      purchasePrices,
    ] = await Promise.all([
      Delivery.find(rangeFilter("deliveredAt", from, to)),
      Return.find({
        returnType: "from_shop",
        ...rangeFilter("returnDate", from, to),
      }),
      PurchaseReceipt.find(rangeFilter("receivedAt", from, to)),
      Return.find({
        returnType: "to_distributor",
        ...rangeFilter("returnDate", from, to),
      }),
      Payment.find({
        partyType: "shop",
        ...rangeFilter("paymentDate", from, to),
      }),
      Payment.find({
        partyType: "distributor",
        ...rangeFilter("paymentDate", from, to),
      }),
      PurchaseReceipt.find({}),
      Return.find({ returnType: "to_distributor" }),
      Shop.find({ isActive: true }),
      Distributor.find({ isActive: true }),
      Product.find({}),
      PurchasePrice.find({}).sort({ updatedAt: -1 }),
    ]);

    /* ---------------- per shop ---------------- */
    const shopMap = {};

    shops.forEach((shop) => {
      shopMap[String(shop._id)] = {
        _id: shop._id,
        name: shop.name,
        sale: 0,
        returns: 0,
        received: 0,
      };
    });

    const ensureShop = (id) => {
      const key = String(id);

      if (!shopMap[key]) {
        shopMap[key] = {
          _id: id,
          name: "(deleted shop)",
          sale: 0,
          returns: 0,
          received: 0,
        };
      }

      return shopMap[key];
    };

    deliveries.forEach((delivery) => {
      const row = ensureShop(delivery.shop);

      delivery.items.forEach((item) => {
        row.sale += item.quantityDelivered * item.pricePerKg;
      });
    });

    shopReturns.forEach((record) => {
      const row = ensureShop(record.shop);

      record.items.forEach((item) => {
        row.returns += item.quantity * (item.pricePerKg || 0);
      });
    });

    shopPayments.forEach((payment) => {
      ensureShop(payment.shop).received += payment.amount;
    });

    /* ---------------- per distributor ---------------- */
    const distributorMap = {};

    distributors.forEach((distributor) => {
      distributorMap[String(distributor._id)] = {
        _id: distributor._id,
        name: distributor.name,
        purchase: 0,
        returns: 0,
        paid: 0,
      };
    });

    const ensureDistributor = (id) => {
      const key = String(id);

      if (!distributorMap[key]) {
        distributorMap[key] = {
          _id: id,
          name: "(deleted distributor)",
          purchase: 0,
          returns: 0,
          paid: 0,
        };
      }

      return distributorMap[key];
    };

    receipts.forEach((receipt) => {
      const row = ensureDistributor(receipt.distributor);

      receipt.items.forEach((item) => {
        row.purchase += item.quantityReceived * item.pricePerKg;
      });
    });

    distributorReturns.forEach((record) => {
      const row = ensureDistributor(record.distributor);

      record.items.forEach((item) => {
        row.returns += item.quantity * (item.pricePerKg || 0);
      });
    });

    distributorPayments.forEach((payment) => {
      ensureDistributor(payment.distributor).paid += payment.amount;
    });

    /* Current balances (always up to today, not limited by the dates) */
    const shopRows = Object.values(shopMap);
    const distributorRows = Object.values(distributorMap);

    // Run the balance look-ups side by side so many shops stay fast
    await Promise.all([
      ...shopRows.map(async (row) => {
        const balance = await getShopOutstanding(row._id);
        row.due = round(balance.due);
        row.advance = round(balance.advance);
      }),
      ...distributorRows.map(async (row) => {
        const balance = await getDistributorOutstanding(row._id);
        row.due = round(balance.due);
        row.advance = round(balance.advance);
      }),
    ]);

    /* ---------------- average buying price per product ---------------- */
    const cost = {};

    const addCost = (productId, kg, value) => {
      const key = String(productId);
      cost[key] = cost[key] || { kg: 0, value: 0 };
      cost[key].kg += kg;
      cost[key].value += value;
    };

    allReceipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        addCost(
          item.product,
          item.quantityReceived,
          item.quantityReceived * item.pricePerKg
        );
      });
    });

    allDistributorReturns.forEach((record) => {
      record.items.forEach((item) => {
        addCost(
          item.product,
          -item.quantity,
          -(item.quantity * (item.pricePerKg || 0))
        );
      });
    });

    // Fallback when a product was never purchased: latest saved price
    const latestPrice = {};

    purchasePrices.forEach((price) => {
      const key = String(price.product);

      if (latestPrice[key] === undefined) {
        latestPrice[key] = price.pricePerKg;
      }
    });

    const averageCost = (productId) => {
      const key = String(productId);
      const entry = cost[key];

      if (entry && entry.kg > 0.0001) {
        return { value: entry.value / entry.kg, known: true };
      }

      if (latestPrice[key] !== undefined) {
        return { value: latestPrice[key], known: true };
      }

      return { value: 0, known: false };
    };

    /* ---------------- profit per product and per month ---------------- */
    const productInfo = {};

    products.forEach((product) => {
      productInfo[String(product._id)] = product;
    });

    const productRows = {};
    const monthRows = {};

    const ensureProduct = (productId) => {
      const key = String(productId);

      if (!productRows[key]) {
        const product = productInfo[key];

        productRows[key] = {
          product: productId,
          name: product ? product.name : "(deleted product)",
          brand: product ? product.brand : "",
          soldKg: 0,
          returnedKg: 0,
          revenue: 0,
        };
      }

      return productRows[key];
    };

    const ensureMonth = (key) => {
      monthRows[key] = monthRows[key] || {
        month: key,
        revenue: 0,
        cost: 0,
      };

      return monthRows[key];
    };

    deliveries.forEach((delivery) => {
      delivery.items.forEach((item) => {
        const row = ensureProduct(item.product);
        const value = item.quantityDelivered * item.pricePerKg;
        const buying = averageCost(item.product).value;
        const month = ensureMonth(monthKey(delivery.deliveredAt));

        row.soldKg += item.quantityDelivered;
        row.revenue += value;

        month.revenue += value;
        month.cost += item.quantityDelivered * buying;
      });
    });

    shopReturns.forEach((record) => {
      record.items.forEach((item) => {
        const row = ensureProduct(item.product);
        const value = item.quantity * (item.pricePerKg || 0);
        const buying = averageCost(item.product).value;
        const month = ensureMonth(monthKey(record.returnDate));

        row.returnedKg += item.quantity;
        row.revenue -= value;

        month.revenue -= value;
        month.cost -= item.quantity * buying;
      });
    });

    const productList = Object.values(productRows).map((row) => {
      const buying = averageCost(row.product);
      const netKg = row.soldKg - row.returnedKg;
      const costValue = netKg * buying.value;
      const profit = row.revenue - costValue;

      return {
        product: row.product,
        name: row.name,
        brand: row.brand,
        netSoldKg: round(netKg),
        revenue: round(row.revenue),
        averageCostPerKg: round(buying.value),
        costKnown: buying.known,
        cost: round(costValue),
        profit: round(profit),
        marginPercent:
          row.revenue > 0 ? round((profit / row.revenue) * 100) : 0,
      };
    });

    const monthList = Object.values(monthRows)
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .map((row) => ({
        month: row.month,
        revenue: round(row.revenue),
        cost: round(row.cost),
        profit: round(row.revenue - row.cost),
      }));

    /* ---------------- overall ---------------- */
    const sum = (rows, key) => rows.reduce((t, r) => t + r[key], 0);

    const totalSale = sum(shopRows, "sale");
    const totalSaleReturns = sum(shopRows, "returns");
    const totalPurchase = sum(distributorRows, "purchase");
    const totalPurchaseReturns = sum(distributorRows, "returns");

    const overall = {
      sale: round(totalSale),
      saleReturns: round(totalSaleReturns),
      netSale: round(totalSale - totalSaleReturns),
      purchase: round(totalPurchase),
      purchaseReturns: round(totalPurchaseReturns),
      netPurchase: round(totalPurchase - totalPurchaseReturns),
      estimatedProfit: round(sum(productList, "profit")),
      shopDue: round(sum(shopRows, "due")),
      shopAdvance: round(sum(shopRows, "advance")),
      distributorDue: round(sum(distributorRows, "due")),
      distributorAdvance: round(sum(distributorRows, "advance")),
    };

    const finish = (rows, keys) =>
      rows.map((row) => {
        const out = { ...row };
        keys.forEach((key) => {
          out[key] = round(out[key]);
        });
        return out;
      });

    res.status(200).json({
      from: from || null,
      to: to || null,
      overall,
      shops: finish(shopRows, ["sale", "returns", "received"])
        .map((row) => ({ ...row, netSale: round(row.sale - row.returns) }))
        .sort((a, b) => b.netSale - a.netSale),
      distributors: finish(distributorRows, [
        "purchase",
        "returns",
        "paid",
      ])
        .map((row) => ({
          ...row,
          netPurchase: round(row.purchase - row.returns),
        }))
        .sort((a, b) => b.netPurchase - a.netPurchase),
      products: productList.sort((a, b) => b.profit - a.profit),
      months: monthList,
    });
  } catch (error) {
    console.error("Business summary error:", error);

    res.status(500).json({
      message: "Failed to build the business summary.",
      error: error.message,
    });
  }
};

module.exports = { getBusinessSummary };
