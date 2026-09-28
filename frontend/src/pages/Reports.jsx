import { useEffect, useState } from "react";
import api from "../services/api";

function Reports() {
  const [paymentsReport, setPaymentsReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPaymentsReport = async (from, to) => {
    try {
      let query = "";

      if (from && to) {
        query = `?from=${from}&to=${to}`;
      }

      const response = await api.get(
        `/reports/payments${query}`
      );

      setPaymentsReport(response.data);

      return true;
    } catch (err) {
      console.error("Payment report error:", err);
      setPaymentsReport(null);

      return false;
    }
  };

  const fetchStockReport = async (from, to) => {
    try {
      let query = "";

      if (from && to) {
        query = `?from=${from}&to=${to}`;
      }

      const response = await api.get(
        `/reports/stock${query}`
      );

      setStockReport(response.data);

      return true;
    } catch (err) {
      console.error("Stock report error:", err);
      setStockReport(null);

      return false;
    }
  };

  const fetchReports = async (from = "", to = "") => {
    setLoading(true);
    setError("");

    const paymentSuccess = await fetchPaymentsReport(
      from,
      to
    );

    const stockSuccess = await fetchStockReport(
      from,
      to
    );

    if (!paymentSuccess && !stockSuccess) {
      setError("Failed to load reports.");
    } else if (!paymentSuccess) {
      setError(
        "Stock report loaded, but payment report could not be loaded."
      );
    } else if (!stockSuccess) {
      setError(
        "Payment report loaded, but stock report could not be loaded."
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchReports("", "");
  }, []);

  const handleApplyFilters = () => {
    setError("");

    if (!fromDate || !toDate) {
      setError(
        "Please select both From Date and To Date."
      );
      return;
    }

    if (fromDate > toDate) {
      setError(
        "From Date cannot be after To Date."
      );
      return;
    }

    fetchReports(fromDate, toDate);
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setError("");

    fetchReports("", "");
  };

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN");
  };

  const formatQuantity = (quantity) => {
    return Number(quantity || 0).toLocaleString("en-IN");
  };

  const getProfitLossClass = (value) => {
    if (Number(value || 0) > 0) {
      return "text-success";
    }

    if (Number(value || 0) < 0) {
      return "text-danger";
    }

    return "text-muted";
  };

  const getProfitLossLabel = (value) => {
    const number = Number(value || 0);

    if (number > 0) {
      return "Profit";
    }

    if (number < 0) {
      return "Loss";
    }

    return "No Profit / Loss";
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="mb-4">
          <h2 className="fw-bold mb-1">
            Reports
          </h2>

          <p className="text-muted">
            View business summaries, stock movement and payment reports.
          </p>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div
              className="spinner-border text-primary mb-3"
              role="status"
            >
              <span className="visually-hidden">
                Loading...
              </span>
            </div>

            <p className="text-muted mb-0">
              Loading reports...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">
          Reports
        </h2>

        <p className="text-muted mb-0">
          View business summaries, stock movement and payment reports.
        </p>
      </div>

      {error && (
        <div className="alert alert-warning">
          {error}
        </div>
      )}

      {/* =====================================================
          REPORT FILTERS
      ===================================================== */}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            Report Period
          </h5>

          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold">
                From Date
              </label>

              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setError("");
                }}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                To Date
              </label>

              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setError("");
                }}
              />
            </div>

            <div className="col-md-4">
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyFilters}
                  disabled={loading}
                >
                  Apply Filters
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClearFilters}
                  disabled={loading}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          PAYMENT REPORT
      ===================================================== */}

      {paymentsReport?.summary && (
        <>
          <h4 className="fw-bold mb-3">
            Payment Summary
          </h4>

          <div className="row g-3 mb-4">
            {/* Overall Profit / Loss */}

            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Overall Profit / Loss
                  </p>

                  <h3
                    className={`fw-bold mb-1 ${getProfitLossClass(
                      paymentsReport.summary.profitLoss
                    )}`}
                  >
                    ₹
                    {formatAmount(
                      Math.abs(
                        paymentsReport.summary.profitLoss || 0
                      )
                    )}
                  </h3>

                  <small
                    className={getProfitLossClass(
                      paymentsReport.summary.profitLoss
                    )}
                  >
                    {getProfitLossLabel(
                      paymentsReport.summary.profitLoss
                    )}
                  </small>
                </div>
              </div>
            </div>

            {/* Received from Shops */}

            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Received from Shops
                  </p>

                  <h3 className="fw-bold mb-0">
                    ₹
                    {formatAmount(
                      paymentsReport.summary.shopPayments
                    )}
                  </h3>
                </div>
              </div>
            </div>

            {/* Paid to Distributors */}

            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Paid to Distributors
                  </p>

                  <h3 className="fw-bold mb-0">
                    ₹
                    {formatAmount(
                      paymentsReport.summary.distributorPayments
                    )}
                  </h3>
                </div>
              </div>
            </div>

            {/* Cash Received */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Cash Received
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹
                    {formatAmount(
                      paymentsReport.summary.cashReceived
                    )}
                  </h5>
                </div>
              </div>
            </div>

            {/* GPay Received */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    GPay Received
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹
                    {formatAmount(
                      paymentsReport.summary.gpayReceived
                    )}
                  </h5>
                </div>
              </div>
            </div>

            {/* Cash Paid */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Cash Paid
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹
                    {formatAmount(
                      paymentsReport.summary.cashPaid
                    )}
                  </h5>
                </div>
              </div>
            </div>

            {/* GPay Paid */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    GPay Paid
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹
                    {formatAmount(
                      paymentsReport.summary.gpayPaid
                    )}
                  </h5>
                </div>
              </div>
            </div>
          </div>

          {/* Day-wise Payment Report */}

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                Day-wise Profit / Loss
              </h5>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="text-end">
                        Received from Shops
                      </th>
                      <th className="text-end">
                        Paid to Distributors
                      </th>
                      <th className="text-end">
                        Profit / Loss
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!paymentsReport.dayWise ||
                    paymentsReport.dayWise.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center text-muted py-4"
                        >
                          No payment data found for this period.
                        </td>
                      </tr>
                    ) : (
                      paymentsReport.dayWise.map(
                        (day) => (
                          <tr key={day.date}>
                            <td className="fw-semibold">
                              {new Date(
                                `${day.date}T00:00:00`
                              ).toLocaleDateString(
                                "en-IN"
                              )}
                            </td>

                            <td className="text-end">
                              ₹
                              {formatAmount(
                                day.shopPayments
                              )}
                            </td>

                            <td className="text-end">
                              ₹
                              {formatAmount(
                                day.distributorPayments
                              )}
                            </td>

                            <td
                              className={`text-end fw-bold ${getProfitLossClass(
                                day.profitLoss
                              )}`}
                            >
                              {day.profitLoss < 0
                                ? "-"
                                : ""}
                              ₹
                              {formatAmount(
                                Math.abs(
                                  day.profitLoss || 0
                                )
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment Details */}

          <div className="card border-0 shadow-sm mb-5">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                Payment Details
              </h5>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Party</th>
                      <th>Type</th>
                      <th>Method</th>
                      <th className="text-end">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!paymentsReport.payments ||
                    paymentsReport.payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center text-muted py-4"
                        >
                          No payments found for this period.
                        </td>
                      </tr>
                    ) : (
                      paymentsReport.payments.map(
                        (payment) => {
                          const partyName =
                            payment.partyType ===
                            "shop"
                              ? payment.shop?.name
                              : payment.distributor
                                  ?.name;

                          return (
                            <tr
                              key={payment._id}
                            >
                              <td>
                                {payment.paymentDate
                                  ? new Date(
                                      payment.paymentDate
                                    ).toLocaleDateString(
                                      "en-IN"
                                    )
                                  : "-"}
                              </td>

                              <td className="fw-semibold">
                                {partyName || "-"}
                              </td>

                              <td>
                                <span className="text-capitalize">
                                  {payment.partyType ||
                                    "-"}
                                </span>
                              </td>

                              <td>
                                <span className="text-uppercase">
                                  {payment.paymentMethod ||
                                    "-"}
                                </span>
                              </td>

                              <td className="text-end fw-semibold">
                                ₹
                                {formatAmount(
                                  payment.amount
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================
          STOCK REPORT
      ===================================================== */}

      {stockReport?.summary && (
        <>
          <h4 className="fw-bold mb-3">
            Stock Summary
          </h4>

          <div className="row g-3 mb-4">
            {/* Purchased */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Purchased
                  </p>

                  <h4 className="fw-bold mb-0">
                    {formatQuantity(
                      stockReport.summary.purchaseQuantity
                    )}{" "}
                    kg
                  </h4>
                </div>
              </div>
            </div>

            {/* Sold */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Sold / Delivered
                  </p>

                  <h4 className="fw-bold mb-0">
                    {formatQuantity(
                      stockReport.summary.soldQuantity ??
                        stockReport.summary.salesQuantity
                    )}{" "}
                    kg
                  </h4>
                </div>
              </div>
            </div>

            {/* Current Stock */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Current Stock
                  </p>

                  <h4 className="fw-bold mb-0">
                    {formatQuantity(
                      stockReport.summary.currentStock
                    )}{" "}
                    kg
                  </h4>
                </div>
              </div>
            </div>

            {/* Net Movement */}

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">
                    Net Movement
                  </p>

                  <h4 className="fw-bold mb-0">
                    {formatQuantity(
                      stockReport.summary.netMovement
                    )}{" "}
                    kg
                  </h4>
                </div>
              </div>
            </div>
          </div>

          {/* Stock by Product */}

          {stockReport.byProduct && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3">
                  Stock by Product
                </h5>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Brand</th>
                        <th>Purchased</th>
                        <th>Sold</th>
                        <th>Returns</th>
                        <th>Adjustments</th>
                        <th>Net Movement</th>
                        <th>Current Stock</th>
                      </tr>
                    </thead>

                    <tbody>
                      {stockReport.byProduct.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="text-center text-muted py-4"
                          >
                            No stock movement found for this period.
                          </td>
                        </tr>
                      ) : (
                        stockReport.byProduct.map(
                          (item, index) => {
                            const totalReturns =
                              Number(
                                item.salesReturnQuantity ||
                                  0
                              ) -
                              Number(
                                item.purchaseReturnQuantity ||
                                  0
                              );

                            const adjustments =
                              Number(
                                item.adjustmentInQuantity ||
                                  0
                              ) -
                              Number(
                                item.adjustmentOutQuantity ||
                                  0
                              );

                            return (
                              <tr
                                key={
                                  item.productId ||
                                  index
                                }
                              >
                                <td className="fw-semibold">
                                  {item.productName ||
                                    "-"}
                                </td>

                                <td>
                                  {item.brand || "-"}
                                </td>

                                <td>
                                  {formatQuantity(
                                    item.purchaseQuantity
                                  )}{" "}
                                  kg
                                </td>

                                <td>
                                  {formatQuantity(
                                    item.salesQuantity
                                  )}{" "}
                                  kg
                                </td>

                                <td>
                                  {totalReturns > 0
                                    ? "+"
                                    : ""}
                                  {formatQuantity(
                                    totalReturns
                                  )}{" "}
                                  kg
                                </td>

                                <td>
                                  {adjustments > 0
                                    ? "+"
                                    : ""}
                                  {formatQuantity(
                                    adjustments
                                  )}{" "}
                                  kg
                                </td>

                                <td className="fw-semibold">
                                  {formatQuantity(
                                    item.netMovement
                                  )}{" "}
                                  kg
                                </td>

                                <td className="fw-bold">
                                  {formatQuantity(
                                    item.currentStock
                                  )}{" "}
                                  kg
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Day-wise Stock */}

          <div className="card border-0 shadow-sm mb-5">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                Day-wise Stock Movement
              </h5>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="text-end">
                        Purchased
                      </th>
                      <th className="text-end">
                        Sold / Delivered
                      </th>
                      <th className="text-end">
                        Sales Returns
                      </th>
                      <th className="text-end">
                        Purchase Returns
                      </th>
                      <th className="text-end">
                        Adjustments
                      </th>
                      <th className="text-end">
                        Net Movement
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!stockReport.dayWise ||
                    stockReport.dayWise.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center text-muted py-4"
                        >
                          No stock movement found for this period.
                        </td>
                      </tr>
                    ) : (
                      stockReport.dayWise.map(
                        (day) => {
                          const adjustments =
                            Number(
                              day.adjustmentInQuantity ||
                                0
                            ) -
                            Number(
                              day.adjustmentOutQuantity ||
                                0
                            );

                          return (
                            <tr key={day.date}>
                              <td className="fw-semibold">
                                {new Date(
                                  `${day.date}T00:00:00`
                                ).toLocaleDateString(
                                  "en-IN"
                                )}
                              </td>

                              <td className="text-end">
                                {formatQuantity(
                                  day.purchaseQuantity
                                )}{" "}
                                kg
                              </td>

                              <td className="text-end">
                                {formatQuantity(
                                  day.salesQuantity
                                )}{" "}
                                kg
                              </td>

                              <td className="text-end">
                                {formatQuantity(
                                  day.salesReturnQuantity
                                )}{" "}
                                kg
                              </td>

                              <td className="text-end">
                                {formatQuantity(
                                  day.purchaseReturnQuantity
                                )}{" "}
                                kg
                              </td>

                              <td className="text-end">
                                {adjustments > 0
                                  ? "+"
                                  : ""}
                                {formatQuantity(
                                  adjustments
                                )}{" "}
                                kg
                              </td>

                              <td
                                className={`text-end fw-bold ${
                                  Number(
                                    day.netMovement || 0
                                  ) >= 0
                                    ? "text-success"
                                    : "text-danger"
                                }`}
                              >
                                {Number(
                                  day.netMovement || 0
                                ) > 0
                                  ? "+"
                                  : ""}
                                {formatQuantity(
                                  day.netMovement
                                )}{" "}
                                kg
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;