import { useEffect, useState } from "react";
import api from "../services/api";

function Dashboard() {
  const [stock, setStock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [payments, setPayments] = useState([]);

  const [shopOutstanding, setShopOutstanding] =
    useState(0);

  const [distributorPayable, setDistributorPayable] =
    useState(0);

  // Advance = party paid more than it owes. Kept apart from dues so
  // one shop's advance never reduces another shop's outstanding.
  const [shopAdvance, setShopAdvance] = useState(0);
  const [distributorAdvance, setDistributorAdvance] =
    useState(0);

  const [receipts, setReceipts] = useState([]);
  const [shopDues, setShopDues] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==============================
  // FETCH DASHBOARD DATA
  // ==============================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch main dashboard data
      const [
        stockResponse,
        ordersResponse,
        deliveriesResponse,
        paymentsResponse,
        shopsResponse,
        distributorsResponse,
        receiptsResponse,
      ] = await Promise.all([
        api.get("/stock"),
        api.get("/shop-orders"),
        api.get("/deliveries"),
        api.get("/payments"),
        api.get("/shops"),
        api.get("/distributors"),
        api.get("/purchase-receipts"),
      ]);

      setStock(stockResponse.data);
      setOrders(ordersResponse.data);
      setDeliveries(deliveriesResponse.data);
      setPayments(paymentsResponse.data);
      setReceipts(receiptsResponse.data);

      // ==============================
      // FETCH SHOP OUTSTANDING
      // ==============================

      const shopOutstandingResponses =
        await Promise.all(
          shopsResponse.data.map((shop) =>
            api.get(
              `/outstanding/shops/${shop._id}`
            )
          )
        );

      const shopBalances = shopOutstandingResponses.map(
        (response, index) => {
          const outstanding = Number(
            response.data.outstanding || 0
          );

          return {
            name: shopsResponse.data[index]?.name || "-",
            due: Math.max(outstanding, 0),
            advance: Math.max(-outstanding, 0),
          };
        }
      );

      setShopOutstanding(
        shopBalances.reduce((t, b) => t + b.due, 0)
      );

      setShopAdvance(
        shopBalances.reduce((t, b) => t + b.advance, 0)
      );

      setShopDues(
        shopBalances
          .filter((b) => b.due > 0)
          .sort((a, b) => b.due - a.due)
          .slice(0, 5)
      );

      // ==============================
      // FETCH DISTRIBUTOR PAYABLE
      // ==============================

      const distributorOutstandingResponses =
        await Promise.all(
          distributorsResponse.data.map(
            (distributor) =>
              api.get(
                `/outstanding/distributors/${distributor._id}`
              )
          )
        );

      const distributorOutstandings =
        distributorOutstandingResponses.map((response) =>
          Number(response.data.outstanding || 0)
        );

      setDistributorPayable(
        distributorOutstandings.reduce(
          (t, v) => t + Math.max(v, 0),
          0
        )
      );

      setDistributorAdvance(
        distributorOutstandings.reduce(
          (t, v) => t + Math.max(-v, 0),
          0
        )
      );
    } catch (err) {
      console.error(
        "Error loading dashboard:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // LOAD DATA
  // ==============================

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ==============================
  // TOTAL STOCK
  // ==============================

  const totalStock = stock.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  // ==============================
  // PENDING ORDERS
  // ==============================

  const pendingOrders = orders.filter(
    (order) =>
      order.status === "pending" ||
      order.status === "partial"
  ).length;

  // ==============================
  // TODAY
  // ==============================

  const today = new Date();

  const isToday = (date) => {
    if (!date) {
      return false;
    }

    const targetDate = new Date(date);

    return (
      targetDate.getDate() === today.getDate() &&
      targetDate.getMonth() ===
        today.getMonth() &&
      targetDate.getFullYear() ===
        today.getFullYear()
    );
  };

  // ==============================
  // TODAY'S DELIVERIES
  // ==============================

  const todaysDeliveries =
    deliveries.filter((delivery) =>
      isToday(
        delivery.deliveredAt ||
          delivery.deliveryDate ||
          delivery.createdAt
      )
    ).length;

  // ==============================
  // TODAY'S PAYMENTS
  // ==============================

  const todaysPayments = payments
    .filter(
      (payment) =>
        payment.partyType === "shop" &&
        isToday(payment.paymentDate)
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  // ==============================
  // THIS MONTH: SALES vs PURCHASES
  // ==============================

  const isThisMonth = (date) => {
    if (!date) {
      return false;
    }

    const target = new Date(date);

    return (
      target.getMonth() === today.getMonth() &&
      target.getFullYear() === today.getFullYear()
    );
  };

  const monthSales = deliveries
    .filter((delivery) =>
      isThisMonth(delivery.deliveredAt || delivery.createdAt)
    )
    .reduce(
      (total, delivery) =>
        total +
        delivery.items.reduce(
          (sum, item) =>
            sum +
            Number(item.quantityDelivered || 0) *
              Number(item.pricePerKg || 0),
          0
        ),
      0
    );

  const monthPurchases = receipts
    .filter((receipt) =>
      isThisMonth(receipt.receivedAt || receipt.createdAt)
    )
    .reduce(
      (total, receipt) =>
        total +
        receipt.items.reduce(
          (sum, item) =>
            sum +
            Number(item.quantityReceived || 0) *
              Number(item.pricePerKg || 0),
          0
        ),
      0
    );

  // ==============================
  // LOW STOCK
  // (change this number to set what counts as "low")
  // ==============================

  const LOW_STOCK_KG = 50;

  const lowStock = stock
    .filter((item) => Number(item.quantity || 0) < LOW_STOCK_KG)
    .sort((a, b) => a.quantity - b.quantity);

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div className="container-fluid py-4">

        <div className="mb-4">
          <h2>Dashboard</h2>

          <p className="text-muted">
            Manage your Mathiya & Chorafali business
          </p>
        </div>

        <div className="text-center py-5">

          <div
            className="spinner-border"
            role="status"
          />

          <p className="text-muted mt-3">
            Loading dashboard...
          </p>

        </div>

      </div>
    );
  }

  // ==============================
  // UI
  // ==============================

  return (
    <div className="container-fluid py-4">

      {/* HEADER */}

      <div className="mb-4">

        <h2>
          Dashboard
        </h2>

        <p className="text-muted mb-0">
          Manage your Mathiya & Chorafali business
        </p>

      </div>

      {/* ERROR */}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* ================================= */}
      {/* MAIN SUMMARY CARDS */}
      {/* ================================= */}

      <div className="row g-4">

        {/* TOTAL STOCK */}

        <div className="col-md-3">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Total Stock
              </h6>

              <h3>
                {totalStock.toLocaleString(
                  "en-IN"
                )}{" "}
                kg
              </h3>

              <p className="mb-0 text-muted">
                Current stock
              </p>

            </div>

          </div>

        </div>

        {/* PENDING ORDERS */}

        <div className="col-md-3">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Pending Orders
              </h6>

              <h3>
                {pendingOrders}
              </h3>

              <p className="mb-0 text-muted">
                Shop orders
              </p>

            </div>

          </div>

        </div>

        {/* DELIVERIES */}

        <div className="col-md-3">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Deliveries
              </h6>

              <h3>
                {todaysDeliveries}
              </h3>

              <p className="mb-0 text-muted">
                Today's deliveries
              </p>

            </div>

          </div>

        </div>

        {/* PAYMENTS */}

        <div className="col-md-3">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Payments
              </h6>

              <h3>
                ₹
                {todaysPayments.toLocaleString(
                  "en-IN"
                )}
              </h3>

              <p className="mb-0 text-muted">
                Today's collection
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* ================================= */}
      {/* OUTSTANDING SUMMARY */}
      {/* ================================= */}

      <div className="row g-4 mt-1">

        {/* SHOP OUTSTANDING (dues only) */}

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">Shop Outstanding</h6>
              <h3 className="text-danger">
                ₹{shopOutstanding.toLocaleString("en-IN")}
              </h3>
              <p className="mb-0 text-muted">
                Amount receivable from shops
              </p>
            </div>
          </div>
        </div>

        {/* SHOP ADVANCE */}

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">Advance from Shops</h6>
              <h3 className="text-success">
                ₹{shopAdvance.toLocaleString("en-IN")}
              </h3>
              <p className="mb-0 text-muted">
                Paid by shops in advance
              </p>
            </div>
          </div>
        </div>

        {/* DISTRIBUTOR PAYABLE (dues only) */}

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">Distributor Payable</h6>
              <h3 className="text-danger">
                ₹{distributorPayable.toLocaleString("en-IN")}
              </h3>
              <p className="mb-0 text-muted">
                Amount payable to distributors
              </p>
            </div>
          </div>
        </div>

        {/* DISTRIBUTOR ADVANCE */}

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Advance to Distributors
              </h6>
              <h3 className="text-success">
                ₹{distributorAdvance.toLocaleString("en-IN")}
              </h3>
              <p className="mb-0 text-muted">
                Paid to distributors in advance
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ================================= */}
      {/* THIS MONTH / LOW STOCK / TOP DUES */}
      {/* ================================= */}

      <div className="row g-4 mt-1">

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">This Month</h6>

              <div className="d-flex justify-content-between">
                <span>Sales</span>
                <strong>₹{monthSales.toLocaleString("en-IN")}</strong>
              </div>

              <div className="d-flex justify-content-between">
                <span>Purchases</span>
                <strong>
                  ₹{monthPurchases.toLocaleString("en-IN")}
                </strong>
              </div>

              <hr className="my-2" />

              <div className="d-flex justify-content-between">
                <span>Sales - Purchases</span>
                <strong
                  className={
                    monthSales - monthPurchases < 0
                      ? "text-danger"
                      : "text-success"
                  }
                >
                  {monthSales - monthPurchases < 0 ? "-" : ""}₹
                  {Math.abs(monthSales - monthPurchases).toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <small className="text-muted">
                Stock bought is not always sold in the same month,
                so see Business Summary for real profit.
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Low Stock (under {LOW_STOCK_KG} kg)
              </h6>

              {lowStock.length === 0 ? (
                <p className="mb-0 text-success">
                  All products have enough stock.
                </p>
              ) : (
                lowStock.map((item) => (
                  <div
                    key={item.product}
                    className="d-flex justify-content-between"
                  >
                    <span>
                      {item.name}
                      {item.brand ? ` - ${item.brand}` : ""}
                    </span>
                    <strong
                      className={
                        item.quantity <= 0 ? "text-danger" : "text-warning"
                      }
                    >
                      {Number(item.quantity).toLocaleString("en-IN")} kg
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">
                Shops Owing the Most
              </h6>

              {shopDues.length === 0 ? (
                <p className="mb-0 text-success">
                  No shop has an outstanding amount.
                </p>
              ) : (
                shopDues.map((shop, index) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between"
                  >
                    <span>{shop.name}</span>
                    <strong className="text-danger">
                      ₹{shop.due.toLocaleString("en-IN")}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ================================= */}
      {/* BUSINESS OVERVIEW */}
      {/* ================================= */}

      <div className="mt-5">

        <h4 className="mb-3">
          Business Overview
        </h4>

        <div className="card shadow-sm">

          <div className="card-body">

            <p className="mb-0">
              Welcome to the Mathiya Business
              Management System. Use the sidebar
              to manage products, purchases, orders,
              deliveries, payments and reports.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;