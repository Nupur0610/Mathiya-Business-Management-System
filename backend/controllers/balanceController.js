const {
    getExpectedBalance,
    getCurrentBalances,
  } = require("../services/balanceService");
  
  // Get current cash balance
  const getCashBalance = async (req, res) => {
    try {
      const balance = await getExpectedBalance("cash");
  
      res.status(200).json(balance);
    } catch (error) {
      console.error("Get cash balance error:", error);
  
      res.status(500).json({
        message: "Failed to calculate cash balance.",
        error: error.message,
      });
    }
  };
  
  // Get current GPay balance
  const getGPayBalance = async (req, res) => {
    try {
      const balance = await getExpectedBalance("gpay");
  
      res.status(200).json(balance);
    } catch (error) {
      console.error("Get GPay balance error:", error);
  
      res.status(500).json({
        message: "Failed to calculate GPay balance.",
        error: error.message,
      });
    }
  };
  
  // Get both balances
  const getBalances = async (req, res) => {
    try {
      const balances = await getCurrentBalances();
  
      res.status(200).json(balances);
    } catch (error) {
      console.error("Get balances error:", error);
  
      res.status(500).json({
        message: "Failed to calculate balances.",
        error: error.message,
      });
    }
  };
  
  module.exports = {
    getCashBalance,
    getGPayBalance,
    getBalances,
  };