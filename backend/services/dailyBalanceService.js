const DailyBalance = require("../models/DailyBalance");
const OpeningBalance = require("../models/OpeningBalance");
const Payment = require("../models/Payment");
const CashTransaction = require("../models/CashTransaction");

const getDayRange = (date) => {
  const dateString =
    typeof date === "string"
      ? date.slice(0, 10)
      : new Date(date).toISOString().slice(0, 10);

  const [year, month, day] = dateString.split("-").map(Number);

  const start = new Date(Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000);
  const end = new Date(
    Date.UTC(year, month - 1, day + 1) - 5.5 * 60 * 60 * 1000 - 1
  );

  return { start, end };
};

const getOpeningBalanceForDay = async (type, date) => {
  const { start } = getDayRange(date);

  const previousDay = await DailyBalance.findOne({
    date: { $lt: start },
    ...(type === "cash"
      ? { actualCash: { $ne: null } }
      : { actualGPay: { $ne: null } }),
  }).sort({ date: -1 });

  if (previousDay) {
    return type === "cash"
      ? previousDay.actualCash ?? previousDay.openingCash
      : previousDay.actualGPay ?? previousDay.openingGPay;
  }

  const openingBalance = await OpeningBalance.findOne({
    type,
    asOfDate: { $lte: start },
  }).sort({
    asOfDate: -1,
    createdAt: -1,
  });

  return openingBalance?.amount || 0;
};

const calculateDailyExpectedBalance = async (type, date) => {
  const { start, end } = getDayRange(date);

  const openingAmount = await getOpeningBalanceForDay(type, date);

  const payments = await Payment.find({
    paymentMethod: type,
    paymentDate: {
      $gte: start,
      $lte: end,
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
      $gte: start,
      $lte: end,
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
    openingBalance: openingAmount,
    shopPayments,
    distributorPayments,
    personalContributions,
    personalWithdrawals,
    expectedBalance,
  };
};

const createDailyBalance = async ({
  date,
  actualCash,
  actualGPay,
  notes,
}) => {
  const { start } = getDayRange(date);

  const cash = await calculateDailyExpectedBalance("cash", date);
  const gpay = await calculateDailyExpectedBalance("gpay", date);

  const cashDifference =
    actualCash !== undefined
      ? actualCash - cash.expectedBalance
      : 0;

  const gpayDifference =
    actualGPay !== undefined
      ? actualGPay - gpay.expectedBalance
      : 0;

  return await DailyBalance.findOneAndUpdate(
    { date: start },
    {
      date: start,
      openingCash: cash.openingBalance,
      openingGPay: gpay.openingBalance,
      expectedCash: cash.expectedBalance,
      expectedGPay: gpay.expectedBalance,
      actualCash,
      actualGPay,
      cashDifference,
      gpayDifference,
      notes,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

module.exports = {
  calculateDailyExpectedBalance,
  createDailyBalance,
};
