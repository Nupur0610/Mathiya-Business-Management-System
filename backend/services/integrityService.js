const Delivery = require("../models/Delivery");
const PurchaseReceipt = require("../models/PurchaseReceipt");
const Return = require("../models/Return");
const { sumByProduct } = require("./orderStatus");

const withSession = (query, session) =>
  session ? query.session(session) : query;

// A shop can never have returned more than it was delivered.
const assertShopReturnsValid = async (shopId, session) => {
  const deliveries = await withSession(
    Delivery.find({ shop: shopId }),
    session
  );
  const returns = await withSession(
    Return.find({ returnType: "from_shop", shop: shopId }),
    session
  );

  const delivered = sumByProduct(
    deliveries.flatMap((d) => d.items),
    "quantityDelivered"
  );
  const returned = sumByProduct(
    returns.flatMap((r) => r.items),
    "quantity"
  );

  for (const [productId, qty] of Object.entries(returned)) {
    if (qty > (delivered[productId] || 0) + 0.0001) {
      throw new Error(
        "This change would leave this shop with more returned stock than delivered stock. Edit or delete the related return first. Nothing was changed."
      );
    }
  }
};

// Same rule for returns sent back to a distributor.
const assertDistributorReturnsValid = async (distributorId, session) => {
  const receipts = await withSession(
    PurchaseReceipt.find({ distributor: distributorId }),
    session
  );
  const returns = await withSession(
    Return.find({ returnType: "to_distributor", distributor: distributorId }),
    session
  );

  const received = sumByProduct(
    receipts.flatMap((r) => r.items),
    "quantityReceived"
  );
  const returned = sumByProduct(
    returns.flatMap((r) => r.items),
    "quantity"
  );

  for (const [productId, qty] of Object.entries(returned)) {
    if (qty > (received[productId] || 0) + 0.0001) {
      throw new Error(
        "This change would leave this distributor with more returned stock than received stock. Edit or delete the related return first. Nothing was changed."
      );
    }
  }
};

module.exports = {
  assertShopReturnsValid,
  assertDistributorReturnsValid,
};
