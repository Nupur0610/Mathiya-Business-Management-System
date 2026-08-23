const Delivery = require("../models/Delivery");
const PurchaseReceipt = require("../models/PurchaseReceipt");
const Payment = require("../models/Payment");
const OpeningBalance = require("../models/OpeningBalance");
const Return = require("../models/Return");

/*
  Calculate outstanding amount for a shop.

  Opening shop receivable
  + Actual delivered value after opening date
  - Sales returns after opening date
  - Payments received after opening date
  = Shop receivable
*/
const getShopOutstanding = async (shopId) => {
  const openingBalance = await OpeningBalance.findOne({
    type: "shop_receivable",
    shop: shopId,
  }).sort({
    asOfDate: -1,
    createdAt: -1,
  });

  const openingAmount = openingBalance?.amount || 0;
  const openingDate = openingBalance?.asOfDate || new Date(0);

  const deliveries = await Delivery.find({
    shop: shopId,
    deliveredAt: {
      $gte: openingDate,
    },
  });

  let totalDeliveredValue = 0;

  deliveries.forEach((delivery) => {
    delivery.items.forEach((item) => {
      totalDeliveredValue +=
        item.quantityDelivered * item.pricePerKg;
    });
  });

  const salesReturns = await Return.find({
    returnType: "from_shop",
    shop: shopId,
    returnDate: {
      $gte: openingDate,
    },
  });

  let totalSalesReturnValue = 0;

  salesReturns.forEach((returnRecord) => {
    returnRecord.items.forEach((item) => {
      totalSalesReturnValue +=
        item.quantity * (item.pricePerKg || 0);
    });
  });

  const payments = await Payment.find({
    partyType: "shop",
    shop: shopId,
    paymentDate: {
      $gte: openingDate,
    },
  });

  const totalPaymentsReceived = payments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  const outstanding =
    openingAmount +
    totalDeliveredValue -
    totalSalesReturnValue -
    totalPaymentsReceived;

  return {
    openingBalance: openingAmount,
    totalDeliveredValue,
    totalSalesReturnValue,
    totalPaymentsReceived,
    outstanding,
  };
};

/*
  Calculate outstanding amount for a distributor.

  Opening distributor payable
  + Actual received value after opening date
  - Purchase returns after opening date
  - Payments made after opening date
  = Distributor payable
*/
const getDistributorOutstanding = async (distributorId) => {
  const openingBalance = await OpeningBalance.findOne({
    type: "distributor_payable",
    distributor: distributorId,
  }).sort({
    asOfDate: -1,
    createdAt: -1,
  });

  const openingAmount = openingBalance?.amount || 0;
  const openingDate = openingBalance?.asOfDate || new Date(0);

  const receipts = await PurchaseReceipt.find({
    distributor: distributorId,
    receivedAt: {
      $gte: openingDate,
    },
  });

  let totalReceivedValue = 0;

  receipts.forEach((receipt) => {
    receipt.items.forEach((item) => {
      totalReceivedValue +=
        item.quantityReceived * item.pricePerKg;
    });
  });

  const purchaseReturns = await Return.find({
    returnType: "to_distributor",
    distributor: distributorId,
    returnDate: {
      $gte: openingDate,
    },
  });

  let totalPurchaseReturnValue = 0;

  purchaseReturns.forEach((returnRecord) => {
    returnRecord.items.forEach((item) => {
      totalPurchaseReturnValue +=
        item.quantity * (item.pricePerKg || 0);
    });
  });

  const payments = await Payment.find({
    partyType: "distributor",
    distributor: distributorId,
    paymentDate: {
      $gte: openingDate,
    },
  });

  const totalPaymentsMade = payments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  const outstanding =
    openingAmount +
    totalReceivedValue -
    totalPurchaseReturnValue -
    totalPaymentsMade;

  return {
    openingBalance: openingAmount,
    totalReceivedValue,
    totalPurchaseReturnValue,
    totalPaymentsMade,
    outstanding,
  };
};

module.exports = {
  getShopOutstanding,
  getDistributorOutstanding,
};