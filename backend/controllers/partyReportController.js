const Shop = require("../models/Shop");
const Distributor = require("../models/Distributor");
const ShopOrder = require("../models/ShopOrder");
const Delivery = require("../models/Delivery");
const PurchaseOrder = require("../models/PurchaseOrder");
const PurchaseReceipt = require("../models/PurchaseReceipt");
const Payment = require("../models/Payment");
const Return = require("../models/Return");
const OpeningBalance = require("../models/OpeningBalance");

const round = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// "2026-10-04" -> start / end of that day in India time
const startOfDay = (value) => new Date(`${value}T00:00:00.000+05:30`);
const endOfDay = (value) => new Date(`${value}T23:59:59.999+05:30`);

const itemValue = (items, qtyKey) =>
  (items || []).reduce(
    (total, item) =>
      total + Number(item[qtyKey] || 0) * Number(item.pricePerKg || 0),
    0
  );

// Splits records into "before the period" and "inside the period"
const splitByPeriod = (records, dateKey, from, to) => {
  const before = [];
  const inside = [];

  records.forEach((record) => {
    const time = new Date(record[dateKey]).getTime();

    if (from && time < from.getTime()) {
      before.push(record);
    } else if (!to || time <= to.getTime()) {
      inside.push(record);
    }
  });

  return { before, inside };
};

const sortNewest = (records, dateKey) =>
  [...records].sort(
    (a, b) => new Date(b[dateKey]) - new Date(a[dateKey])
  );

/*
  Shop-wise report
  Balance  = opening + delivered - returns - payments
  Stock    = (all time) delivered kg - returned kg, per product
*/
const getShopReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const shop = await Shop.findById(id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const fromDate = from ? startOfDay(from) : null;
    const toDate = to ? endOfDay(to) : null;

    const openingBalance = await OpeningBalance.findOne({
      type: "shop_receivable",
      shop: id,
    }).sort({ asOfDate: -1, createdAt: -1 });

    const openingAmount = openingBalance?.amount || 0;
    const openingDate = openingBalance?.asOfDate || new Date(0);

    const [orders, deliveries, payments, returns] = await Promise.all([
      ShopOrder.find({ shop: id }).populate("items.product"),
      Delivery.find({ shop: id }).populate("items.product"),
      Payment.find({ partyType: "shop", shop: id }),
      Return.find({ returnType: "from_shop", shop: id }).populate(
        "items.product"
      ),
    ]);

    // ---- Stock with the shop (all time) ----
    const stockMap = {};

    const addStock = (product, key, qty) => {
      if (!product) return;
      const pid = String(product._id);

      if (!stockMap[pid]) {
        stockMap[pid] = {
          product: product._id,
          name: product.name,
          brand: product.brand,
          unit: product.unit || "kg",
          delivered: 0,
          returned: 0,
        };
      }

      stockMap[pid][key] += Number(qty || 0);
    };

    deliveries.forEach((delivery) =>
      delivery.items.forEach((item) =>
        addStock(item.product, "delivered", item.quantityDelivered)
      )
    );

    returns.forEach((record) =>
      record.items.forEach((item) =>
        addStock(item.product, "returned", item.quantity)
      )
    );

    const stock = Object.values(stockMap)
      .map((row) => ({
        ...row,
        delivered: round(row.delivered),
        returned: round(row.returned),
        stock: round(row.delivered - row.returned),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // ---- Money ----
    const afterOpening = (records, key) =>
      records.filter(
        (record) => new Date(record[key]) >= openingDate
      );

    const deliveriesSplit = splitByPeriod(
      afterOpening(deliveries, "deliveredAt"),
      "deliveredAt",
      fromDate,
      toDate
    );
    const returnsSplit = splitByPeriod(
      afterOpening(returns, "returnDate"),
      "returnDate",
      fromDate,
      toDate
    );
    const paymentsSplit = splitByPeriod(
      afterOpening(payments, "paymentDate"),
      "paymentDate",
      fromDate,
      toDate
    );

    const sumDeliveries = (list) =>
      list.reduce(
        (total, d) => total + itemValue(d.items, "quantityDelivered"),
        0
      );
    const sumReturns = (list) =>
      list.reduce((total, r) => total + itemValue(r.items, "quantity"), 0);
    const sumPayments = (list) =>
      list.reduce((total, p) => total + p.amount, 0);

    const balanceAtStart = fromDate
      ? openingAmount +
        sumDeliveries(deliveriesSplit.before) -
        sumReturns(returnsSplit.before) -
        sumPayments(paymentsSplit.before)
      : openingAmount;

    const periodDelivered = sumDeliveries(deliveriesSplit.inside);
    const periodReturns = sumReturns(returnsSplit.inside);
    const periodPayments = sumPayments(paymentsSplit.inside);

    const closing =
      balanceAtStart + periodDelivered - periodReturns - periodPayments;

    const ordersInPeriod = splitByPeriod(
      orders,
      "orderDate",
      fromDate,
      toDate
    ).inside;

    res.status(200).json({
      shop: { _id: shop._id, name: shop.name, ownerName: shop.ownerName },
      period: { from: from || null, to: to || null },
      summary: {
        balanceAtStart: round(balanceAtStart),
        totalDelivered: round(periodDelivered),
        totalReturns: round(periodReturns),
        totalPayments: round(periodPayments),
        closingBalance: round(closing),
        due: round(Math.max(closing, 0)),
        advance: round(Math.max(-closing, 0)),
      },
      stock,
      orders: sortNewest(ordersInPeriod, "orderDate"),
      deliveries: sortNewest(deliveriesSplit.inside, "deliveredAt"),
      payments: sortNewest(paymentsSplit.inside, "paymentDate"),
      returns: sortNewest(returnsSplit.inside, "returnDate"),
    });
  } catch (error) {
    console.error("Shop report error:", error);

    res.status(500).json({
      message: "Failed to build shop report",
      error: error.message,
    });
  }
};

/*
  Distributor-wise report
  Balance = opening + received - returns - payments
*/
const getDistributorReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const distributor = await Distributor.findById(id);

    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const fromDate = from ? startOfDay(from) : null;
    const toDate = to ? endOfDay(to) : null;

    const openingBalance = await OpeningBalance.findOne({
      type: "distributor_payable",
      distributor: id,
    }).sort({ asOfDate: -1, createdAt: -1 });

    const openingAmount = openingBalance?.amount || 0;
    const openingDate = openingBalance?.asOfDate || new Date(0);

    const [orders, receipts, payments, returns] = await Promise.all([
      PurchaseOrder.find({ distributor: id }).populate("items.product"),
      PurchaseReceipt.find({ distributor: id }).populate("items.product"),
      Payment.find({ partyType: "distributor", distributor: id }),
      Return.find({ returnType: "to_distributor", distributor: id }).populate(
        "items.product"
      ),
    ]);

    const afterOpening = (records, key) =>
      records.filter(
        (record) => new Date(record[key]) >= openingDate
      );

    const receiptsSplit = splitByPeriod(
      afterOpening(receipts, "receivedAt"),
      "receivedAt",
      fromDate,
      toDate
    );
    const returnsSplit = splitByPeriod(
      afterOpening(returns, "returnDate"),
      "returnDate",
      fromDate,
      toDate
    );
    const paymentsSplit = splitByPeriod(
      afterOpening(payments, "paymentDate"),
      "paymentDate",
      fromDate,
      toDate
    );

    const sumReceipts = (list) =>
      list.reduce(
        (total, r) => total + itemValue(r.items, "quantityReceived"),
        0
      );
    const sumReturns = (list) =>
      list.reduce((total, r) => total + itemValue(r.items, "quantity"), 0);
    const sumPayments = (list) =>
      list.reduce((total, p) => total + p.amount, 0);

    const balanceAtStart = fromDate
      ? openingAmount +
        sumReceipts(receiptsSplit.before) -
        sumReturns(returnsSplit.before) -
        sumPayments(paymentsSplit.before)
      : openingAmount;

    const periodReceived = sumReceipts(receiptsSplit.inside);
    const periodReturns = sumReturns(returnsSplit.inside);
    const periodPayments = sumPayments(paymentsSplit.inside);

    const closing =
      balanceAtStart + periodReceived - periodReturns - periodPayments;

    const ordersInPeriod = splitByPeriod(
      orders,
      "orderDate",
      fromDate,
      toDate
    ).inside;

    res.status(200).json({
      distributor: {
        _id: distributor._id,
        name: distributor.name,
      },
      period: { from: from || null, to: to || null },
      summary: {
        balanceAtStart: round(balanceAtStart),
        totalReceived: round(periodReceived),
        totalReturns: round(periodReturns),
        totalPayments: round(periodPayments),
        closingBalance: round(closing),
        due: round(Math.max(closing, 0)),
        advance: round(Math.max(-closing, 0)),
      },
      orders: sortNewest(ordersInPeriod, "orderDate"),
      receipts: sortNewest(receiptsSplit.inside, "receivedAt"),
      payments: sortNewest(paymentsSplit.inside, "paymentDate"),
      returns: sortNewest(returnsSplit.inside, "returnDate"),
    });
  } catch (error) {
    console.error("Distributor report error:", error);

    res.status(500).json({
      message: "Failed to build distributor report",
      error: error.message,
    });
  }
};

module.exports = { getShopReport, getDistributorReport };
