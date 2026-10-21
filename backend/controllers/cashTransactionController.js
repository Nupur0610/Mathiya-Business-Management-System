const CashTransaction = require("../models/CashTransaction");

// Create personal cash/GPay transaction
const createCashTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      paymentMethod,
      transactionDate,
      notes,
    } = req.body;

    // Required fields
    if (!type || !amount || !paymentMethod) {
      return res.status(400).json({
        message: "type, amount and paymentMethod are required.",
      });
    }

    // Validate type
    if (!["personal_withdrawal", "personal_contribution"].includes(type)) {
      return res.status(400).json({
        message:
          "type must be personal_withdrawal or personal_contribution.",
      });
    }

    // Validate payment method
    if (!["cash", "gpay"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "paymentMethod must be cash or gpay.",
      });
    }

    // Create transaction
    const transaction = await CashTransaction.create({
      type,
      amount,
      paymentMethod,
      transactionDate,
      notes,
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Create cash transaction error:", error);

    res.status(500).json({
      message: "Failed to create cash transaction.",
      error: error.message,
    });
  }
};

// Get cash transaction history
const getCashTransactions = async (req, res) => {
  try {
    const transactions = await CashTransaction.find().sort({
      transactionDate: -1,
      createdAt: -1,
    });

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Get cash transactions error:", error);

    res.status(500).json({
      message: "Failed to fetch cash transactions.",
      error: error.message,
    });
  }
};


const updateCashTransaction = async (req, res) => {
  try {
    const { type, amount, paymentMethod, transactionDate, notes } =
      req.body;

    if (!type || !amount || !paymentMethod) {
      return res.status(400).json({
        message: "type, amount and paymentMethod are required.",
      });
    }

    if (!["personal_withdrawal", "personal_contribution"].includes(type)) {
      return res.status(400).json({
        message:
          "type must be personal_withdrawal or personal_contribution.",
      });
    }

    if (!["cash", "gpay"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "paymentMethod must be cash or gpay.",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0.",
      });
    }

    const transaction = await CashTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    transaction.type = type;
    transaction.amount = Number(amount);
    transaction.paymentMethod = paymentMethod;
    if (transactionDate) transaction.transactionDate = transactionDate;
    transaction.notes = notes;

    await transaction.save();

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Update cash transaction error:", error);

    res.status(500).json({
      message: "Failed to update cash transaction.",
      error: error.message,
    });
  }
};

const deleteCashTransaction = async (req, res) => {
  try {
    const transaction = await CashTransaction.findByIdAndDelete(
      req.params.id
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    res.status(200).json({ message: "Transaction deleted." });
  } catch (error) {
    console.error("Delete cash transaction error:", error);

    res.status(500).json({
      message: "Failed to delete cash transaction.",
      error: error.message,
    });
  }
};

module.exports = {
  createCashTransaction,
  getCashTransactions,
  updateCashTransaction,
  deleteCashTransaction,
};