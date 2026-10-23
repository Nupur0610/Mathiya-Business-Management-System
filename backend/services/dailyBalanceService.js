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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// India-time day key (yyyy-mm-dd) of any date
const istKey = (date) =>
  new Date(new Date(date).getTime() + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);

const addDaysToKey = (key, days) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/*
  Opening balance of a day.

  Starts from the last day that was closed with a counted (actual)
  amount, or from the Opening Balance entry. Every day after that and
  before the selected day is carried forward: if that day was closed
  with an actual amount, the actual amount is used; if it was NOT
  closed (or left blank), the EXPECTED amount (opening + shop payments
  + contributions - distributor payments - withdrawals) is used.
*/
const getOpeningBalanceForDay = async (type, date) => {
  const { start } = getDayRange(date);
  const targetKey = istKey(start);
  const actualField = type === "cash" ? "actualCash" : "actualGPay";

  const previousDay = await DailyBalance.findOne({
    date: { $lt: start },
    [actualField]: { $ne: null },
  }).sort({ date: -1 });

  let amount;
  let cursor;

  if (previousDay) {
    amount = previousDay[actualField];
    cursor = addDaysToKey(istKey(previousDay.date), 1);
  } else {
    const openingBalance = await OpeningBalance.findOne({
      type,
      asOfDate: { $lte: start },
    }).sort({
      asOfDate: -1,
      createdAt: -1,
    });

    if (!openingBalance) {
      return 0;
    }

    amount = openingBalance.amount || 0;
    cursor = istKey(openingBalance.asOfDate);
  }

  if (cursor >= targetKey) {
    return amount;
  }

  const rangeStart = getDayRange(cursor).start;

  const [payments, transactions, closedDays] = await Promise.all([
    Payment.find({
      paymentMethod: type,
      paymentDate: { $gte: rangeStart, $lt: start },
    }),
    CashTransaction.find({
      paymentMethod: type,
      transactionDate: { $gte: rangeStart, $lt: start },
    }),
    DailyBalance.find({
      date: { $gte: rangeStart, $lt: start },
      [actualField]: { $ne: null },
    }),
  ]);

  const flowByDay = {};
  const addFlow = (key, value) => {
    flowByDay[key] = (flowByDay[key] || 0) + value;
  };

  payments.forEach((payment) => {
    addFlow(
      istKey(payment.paymentDate),
      payment.partyType === "shop" ? payment.amount : -payment.amount
    );
  });

  transactions.forEach((transaction) => {
    addFlow(
      istKey(transaction.transactionDate),
      transaction.type === "personal_contribution"
        ? transaction.amount
        : transaction.type === "personal_withdrawal"
        ? -transaction.amount
        : 0
    );
  });

  const actualByDay = {};
  closedDays.forEach((day) => {
    actualByDay[istKey(day.date)] = day[actualField];
  });

  let guard = 0;

  while (cursor < targetKey && guard < 3700) {
    if (actualByDay[cursor] !== undefined) {
      amount = actualByDay[cursor];
    } else {
      amount += flowByDay[cursor] || 0;
    }

    cursor = addDaysToKey(cursor, 1);
    guard += 1;
  }

  return amount;
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

  // Left blank = use the expected amount and carry on with it
  const finalActualCash =
    actualCash !== undefined && actualCash !== null
      ? actualCash
      : cash.expectedBalance;

  const finalActualGPay =
    actualGPay !== undefined && actualGPay !== null
      ? actualGPay
      : gpay.expectedBalance;

  const cashDifference = finalActualCash - cash.expectedBalance;
  const gpayDifference = finalActualGPay - gpay.expectedBalance;

  return await DailyBalance.findOneAndUpdate(
    { date: start },
    {
      date: start,
      openingCash: cash.openingBalance,
      openingGPay: gpay.openingBalance,
      expectedCash: cash.expectedBalance,
      expectedGPay: gpay.expectedBalance,
      actualCash: finalActualCash,
      actualGPay: finalActualGPay,
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
