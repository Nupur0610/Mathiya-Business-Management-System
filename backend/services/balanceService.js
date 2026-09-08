const OpeningBalance = require("../models/OpeningBalance");
const Payment = require("../models/Payment");
const CashTransaction = require("../models/CashTransaction");
const DailyBalance = require("../models/DailyBalance");

const getCurrentDateRange = () => {
  const now = new Date();

  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);

  const [year, month, day] = indiaDate.split("-").map(Number);

  const start = new Date(
    Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000
  );

  return { start };
};

const getExpectedBalance = async (type) => {
  const { start: todayStart } = getCurrentDateRange();

  const latestDailyBalance = await DailyBalance.findOne({
    date: { $lt: todayStart },
    ...(type === "cash"
      ? { actualCash: { $ne: null } }
      : { actualGPay: { $ne: null } }),
  }).sort({ date: -1 });

  let openingAmount;
  let transactionDate;

  if (latestDailyBalance) {
    openingAmount =
      type === "cash"
        ? latestDailyBalance.actualCash ?? latestDailyBalance.openingCash
        : latestDailyBalance.actualGPay ?? latestDailyBalance.openingGPay;

    transactionDate = new Date(
      latestDailyBalance.date.getTime() + 24 * 60 * 60 * 1000
    );
  } else {
    const openingBalance = await OpeningBalance.findOne({
      type,
    }).sort({
      asOfDate: -1,
      createdAt: -1,
    });

    openingAmount = openingBalance?.amount || 0;
    transactionDate = openingBalance?.asOfDate || new Date(0);
  }

  const payments = await Payment.find({
    paymentMethod: type,
    paymentDate: {
      $gte: transactionDate,
    },
  });

  let shopPayments = 0;
  let distributorPayments = 0;

  payments.forEach((payment) => {
    if (payment.partyType === "shop") {
      shopPayments += payment.amount;
    }

    if (payment.partyType === "distributor") {
      distributorPayments += payment.amount;
    }
  });

  const personalTransactions = await CashTransaction.find({
    paymentMethod: type,
    transactionDate: {
      $gte: transactionDate,
    },
  });

  let personalContributions = 0;
  let personalWithdrawals = 0;

  personalTransactions.forEach((transaction) => {
    if (transaction.type === "personal_contribution") {
      personalContributions += transaction.amount;
    }

    if (transaction.type === "personal_withdrawal") {
      personalWithdrawals += transaction.amount;
    }
  });

  const expectedBalance =
    openingAmount +
    shopPayments +
    personalContributions -
    distributorPayments -
    personalWithdrawals;

  return {
    type,
    openingBalance: openingAmount,
    shopPayments,
    distributorPayments,
    personalContributions,
    personalWithdrawals,
    expectedBalance,
    openingBalanceDate: latestDailyBalance?.date || null,
  };
};

const getCurrentBalances = async () => {
  const cash = await getExpectedBalance("cash");
  const gpay = await getExpectedBalance("gpay");

  return {
    cash,
    gpay,
  };
};

module.exports = {
  getExpectedBalance,
  getCurrentBalances,
};
