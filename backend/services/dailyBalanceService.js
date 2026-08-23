const DailyBalance = require("../models/DailyBalance");
const OpeningBalance = require("../models/OpeningBalance");
const Payment = require("../models/Payment");
const CashTransaction = require("../models/CashTransaction");

// Get start and end of a particular day
const getDayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Get the opening balance for a day
const getOpeningBalanceForDay = async (type, date) => {
  const { start } = getDayRange(date);

  // First look for previous daily balance
  const previousDay = await DailyBalance.findOne({
    date: { $lt: start },
  }).sort({ date: -1 });

  if (previousDay) {
    return type === "cash"
      ? previousDay.actualCash ?? previousDay.openingCash
      : previousDay.actualGPay ?? previousDay.openingGPay;
  }

  // If there is no previous daily balance,
  // use the initial opening balance.
  const openingBalance = await OpeningBalance.findOne({
    type,
    asOfDate: { $lte: start },
  }).sort({
    asOfDate: -1,
    createdAt: -1,
  });

  return openingBalance?.amount || 0;
};

// Calculate expected balance for one day
const calculateDailyExpectedBalance = async (type, date) => {
  const { start, end } = getDayRange(date);

  const openingAmount = await getOpeningBalanceForDay(type, date);

  // Business payments made/received during the day
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

  // Personal cash/GPay transactions during the day
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

// Create or update daily balance
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

  const dailyBalance = await DailyBalance.findOneAndUpdate(
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

  return dailyBalance;
};

module.exports = {
  calculateDailyExpectedBalance,
  createDailyBalance,
};