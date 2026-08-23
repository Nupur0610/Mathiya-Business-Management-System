const StockTransaction = require("../models/StockTransaction");

const createStockTransaction = async ({
  product,
  type,
  quantity,
  referenceType,
  referenceId,
  transactionDate,
  notes,
  session,
}) => {
  if (!product) {
    throw new Error("Product is required");
  }

  if (!type) {
    throw new Error("Stock transaction type is required");
  }

  if (!quantity || quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (!referenceType) {
    throw new Error("Reference type is required");
  }

  if (!referenceId) {
    throw new Error("Reference ID is required");
  }

  const transactionData = {
    product,
    type,
    quantity,
    referenceType,
    referenceId,
    transactionDate,
    notes,
  };

  const transaction = await StockTransaction.create(
    [transactionData],
    { session }
  );

  return transaction[0];
};

const getStockQuantity = async (productId) => {
  const transactions = await StockTransaction.find({
    product: productId,
  });

  let stock = 0;

  for (const transaction of transactions) {
    if (
      transaction.type === "PURCHASE_RECEIPT" ||
      transaction.type === "SALES_RETURN" ||
      transaction.type === "ADJUSTMENT_IN"
    ) {
      stock += transaction.quantity;
    }

    if (
      transaction.type === "DELIVERY" ||
      transaction.type === "PURCHASE_RETURN" ||
      transaction.type === "ADJUSTMENT_OUT"
    ) {
      stock -= transaction.quantity;
    }
  }

  return stock;
};

module.exports = {
  createStockTransaction,
  getStockQuantity,
};