// Works out the status of a shop order / purchase order from how much
// has been delivered / received so far.
//   orderItems:     [{ product, quantity }]
//   fulfilledItems: [{ product, <qtyKey> }]  (all deliveries / receipts)
// A cancelled order always stays cancelled.
const computeOrderStatus = (
  orderItems,
  fulfilledItems,
  qtyKey,
  currentStatus
) => {
  if (currentStatus === "cancelled") {
    return "cancelled";
  }

  let allCompleted = true;
  let anyFulfilled = false;

  for (const orderItem of orderItems) {
    let total = 0;

    for (const item of fulfilledItems) {
      if (String(item.product) === String(orderItem.product)) {
        total += Number(item[qtyKey] || 0);
      }
    }

    if (total > 0) {
      anyFulfilled = true;
    }

    if (total < orderItem.quantity) {
      allCompleted = false;
    }
  }

  if (allCompleted) return "completed";
  if (anyFulfilled) return "partial";
  return "pending";
};

// Total quantity per product, e.g. { productId: 12.5 }
const sumByProduct = (items, qtyKey) => {
  const totals = {};

  for (const item of items) {
    const id = String(item.product);
    totals[id] = (totals[id] || 0) + Number(item[qtyKey] || 0);
  }

  return totals;
};

module.exports = { computeOrderStatus, sumByProduct };
