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
      ] = await Promise.all([
        api.get("http://localhost:5000/api/stock"),
        api.get("http://localhost:5000/api/shop-orders"),
        api.get("http://localhost:5000/api/deliveries"),
        api.get("http://localhost:5000/api/payments"),
        api.get("http://localhost:5000/api/shops"),
        api.get("http://localhost:5000/api/distributors"),
      ]);

      setStock(stockResponse.data);
      setOrders(ordersResponse.data);
      setDeliveries(deliveriesResponse.data);
      setPayments(paymentsResponse.data);

      // ==============================
      // FETCH SHOP OUTSTANDING
      // ==============================

      const shopOutstandingResponses =
        await Promise.all(
          shopsResponse.data.map((shop) =>
            api.get(
              `http://localhost:5000/api/outstanding/shops/${shop._id}`
            )
          )
        );

      const totalShopOutstanding =
        shopOutstandingResponses.reduce(
          (total, response) =>
            total +
            Number(
              response.data.outstanding || 0
            ),
          0
        );

      setShopOutstanding(
        totalShopOutstanding
      );

      // ==============================
      // FETCH DISTRIBUTOR PAYABLE
      // ==============================

      const distributorOutstandingResponses =
        await Promise.all(
          distributorsResponse.data.map(
            (distributor) =>
              api.get(
                `http://localhost:5000/api/outstanding/distributors/${distributor._id}`
              )
          )
        );

      const totalDistributorPayable =
        distributorOutstandingResponses.reduce(
          (total, response) =>
            total +
            Number(
              response.data.outstanding || 0
            ),
          0
        );

      setDistributorPayable(
        totalDistributorPayable
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
    .filter((payment) =>
      isToday(payment.paymentDate)
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

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

        {/* SHOP OUTSTANDING */}

        <div className="col-md-6">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Shop Outstanding
              </h6>

              <h3>
                ₹
                {shopOutstanding.toLocaleString(
                  "en-IN"
                )}
              </h3>

              <p className="mb-0 text-muted">
                Amount receivable from shops
              </p>

            </div>

          </div>

        </div>

        {/* DISTRIBUTOR PAYABLE */}

        <div className="col-md-6">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <h6 className="text-muted">
                Distributor Payable
              </h6>

              <h3>
                ₹
                {distributorPayable.toLocaleString(
                  "en-IN"
                )}
              </h3>

              <p className="mb-0 text-muted">
                Amount payable to distributors
              </p>

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