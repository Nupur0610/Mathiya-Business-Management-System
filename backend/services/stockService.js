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

const getStockQuantity = async (productId, session) => {
  const query = StockTransaction.find({
    product: productId,
  });

  if (session) {
    query.session(session);
  }

  const transactions = await query;

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

// Remove every stock transaction created by one record
// (used when a delivery / receipt / return / adjustment is edited or deleted)
const deleteStockTransactionsByReference = async (
  referenceType,
  referenceId,
  session
) => {
  await StockTransaction.deleteMany(
    { referenceType, referenceId },
    { session }
  );
};

// Throw an error if stock of any of these products is below zero.
// Called inside a transaction, so the whole change is rolled back.
const assertStockNotNegative = async (productIds, session) => {
  const Product = require("../models/Product");

  const uniqueIds = [
    ...new Set(productIds.filter(Boolean).map((id) => String(id))),
  ];

  for (const id of uniqueIds) {
    const quantity = await getStockQuantity(id, session);

    if (quantity < -0.0001) {
      const product = await Product.findById(id);

      throw new Error(
        `This change would make the stock of ${
          product ? product.name : "a product"
        } negative (${quantity}). Nothing was changed.`
      );
    }
  }
};

module.exports = {
  createStockTransaction,
  getStockQuantity,
  deleteStockTransactionsByReference,
  assertStockNotNegative,
};