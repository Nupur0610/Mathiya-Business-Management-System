const OpeningBalance = require("../models/OpeningBalance");
const Payment = require("../models/Payment");
const CashTransaction = require("../models/CashTransaction");

// Calculate current expected cash or GPay balance
const getExpectedBalance = async (type) => {
  // Find the latest opening balance for this type
  const openingBalance = await OpeningBalance.findOne({
    type,
  }).sort({
    asOfDate: -1,
    createdAt: -1,
  });

  const openingAmount = openingBalance?.amount || 0;

  // Only count transactions after the opening balance date
  const transactionDate = openingBalance?.asOfDate || new Date(0);

  // Business payments
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

  // Personal transactions
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
    openingBalanceDate: openingBalance?.asOfDate || null,
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