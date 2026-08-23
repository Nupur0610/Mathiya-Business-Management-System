const DailyBalance = require("../models/DailyBalance");

const {
  createDailyBalance,
} = require("../services/dailyBalanceService");

// Create/update daily balance
const saveDailyBalance = async (req, res) => {
  try {
    const {
      date,
      actualCash,
      actualGPay,
      notes,
    } = req.body;

    if (!date) {
      return res.status(400).json({
        message: "Date is required.",
      });
    }

    if (actualCash === undefined && actualGPay === undefined) {
      return res.status(400).json({
        message: "At least actualCash or actualGPay is required.",
      });
    }

    if (actualCash !== undefined && actualCash < 0) {
      return res.status(400).json({
        message: "actualCash cannot be negative.",
      });
    }

    if (actualGPay !== undefined && actualGPay < 0) {
      return res.status(400).json({
        message: "actualGPay cannot be negative.",
      });
    }

    const dailyBalance = await createDailyBalance({
      date,
      actualCash,
      actualGPay,
      notes,
    });

    res.status(201).json(dailyBalance);
  } catch (error) {
    console.error("Save daily balance error:", error);

    res.status(500).json({
      message: "Failed to save daily balance.",
      error: error.message,
    });
  }
};

// Get daily balance by date
const getDailyBalance = async (req, res) => {
  try {
    const { date } = req.params;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const dailyBalance = await DailyBalance.findOne({
      date: start,
    });

    if (!dailyBalance) {
      return res.status(404).json({
        message: "Daily balance not found for this date.",
      });
    }

    res.status(200).json(dailyBalance);
  } catch (error) {
    console.error("Get daily balance error:", error);

    res.status(500).json({
      message: "Failed to fetch daily balance.",
      error: error.message,
    });
  }
};

// Get daily balance history
const getDailyBalances = async (req, res) => {
  try {
    const dailyBalances = await DailyBalance.find().sort({
      date: -1,
    });

    res.status(200).json(dailyBalances);
  } catch (error) {
    console.error("Get daily balances error:", error);

    res.status(500).json({
      message: "Failed to fetch daily balances.",
      error: error.message,
    });
  }
};

module.exports = {
  saveDailyBalance,
  getDailyBalance,
  getDailyBalances,
};