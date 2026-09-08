import { useEffect, useState } from "react";
import api from "../services/api";

function Reports() {
  const [paymentsReport, setPaymentsReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // FETCH PAYMENT REPORT
  // --------------------------------------------------

  const fetchPaymentsReport = async (from, to) => {
    try {
      let query = "";

      if (from && to) {
        query = `?from=${from}&to=${to}`;
      }

      console.log("Payment report request:", `/reports/payments${query}`);

      const response = await api.get(
        `/reports/payments${query}`
      );

      console.log("Payment report response:", response.data);

      setPaymentsReport(response.data);

      return true;
    } catch (err) {
      console.error("Payment report error:", err);

      setPaymentsReport(null);

      return false;
    }
  };

  // --------------------------------------------------
  // FETCH STOCK REPORT
  // --------------------------------------------------

  const fetchStockReport = async (from, to) => {
    try {
      let query = "";

      if (from && to) {
        query = `?from=${from}&to=${to}`;
      }

      console.log("Stock report request:", `/reports/stock${query}`);

      const response = await api.get(
        `/reports/stock${query}`
      );

      console.log("Stock report response:", response.data);

      setStockReport(response.data);

      return true;
    } catch (err) {
      console.error("Stock report error:", err);

      setStockReport(null);

      return false;
    }
  };

  // --------------------------------------------------
  // FETCH ALL REPORTS
  // --------------------------------------------------

  const fetchReports = async (from = "", to = "") => {
    setLoading(true);
    setError("");

    console.log("=================================");
    console.log("FETCHING REPORTS");
    console.log("From:", from);
    console.log("To:", to);
    console.log("=================================");

    const paymentSuccess = await fetchPaymentsReport(from, to);
    const stockSuccess = await fetchStockReport(from, to);

    if (!paymentSuccess && !stockSuccess) {
      setError("Failed to load reports.");
    } else if (!stockSuccess) {
      setError(
        "Payment report loaded, but stock report could not be loaded."
      );
    }

    setLoading(false);
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    fetchReports("", "");
  }, []);

  // --------------------------------------------------
  // APPLY FILTERS
  // --------------------------------------------------

  const handleApplyFilters = () => {
    console.log("=================================");
    console.log("APPLY FILTERS CLICKED");
    console.log("From Date:", fromDate);
    console.log("To Date:", toDate);
    console.log("=================================");

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

  // --------------------------------------------------
  // CLEAR FILTERS
  // --------------------------------------------------

  const handleClearFilters = () => {
    console.log("CLEAR FILTERS CLICKED");

    setFromDate("");
    setToDate("");
    setError("");

    fetchReports("", "");
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

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

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="container py-4">

      {/* --------------------------------------------- */}
      {/* HEADER */}
      {/* --------------------------------------------- */}

      <div className="mb-4">

        <h2 className="fw-bold mb-1">
          Reports
        </h2>

        <p className="text-muted mb-0">
          View business summaries, stock movement and payment reports.
        </p>

      </div>


      {/* --------------------------------------------- */}
      {/* ERROR */}
      {/* --------------------------------------------- */}

      {error && (
        <div className="alert alert-warning">
          {error}
        </div>
      )}


      {/* --------------------------------------------- */}
      {/* FILTERS */}
      {/* --------------------------------------------- */}

      <div className="card border-0 shadow-sm mb-4">

        <div className="card-body">

          <h5 className="fw-bold mb-3">
            Report Period
          </h5>

          <div className="row g-3 align-items-end">

            {/* FROM */}

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


            {/* TO */}

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


            {/* BUTTONS */}

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


      {/* ================================================= */}
      {/* PAYMENT REPORT */}
      {/* ================================================= */}

      {paymentsReport?.summary && (
        <>

          <h4 className="fw-bold mb-3">
            Payment Summary
          </h4>


          <div className="row g-3 mb-4">

            {/* TOTAL */}

            <div className="col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Total Payments
                  </p>

                  <h3 className="fw-bold mb-0">
                    ₹{paymentsReport.summary.totalPayments ?? 0}
                  </h3>

                </div>

              </div>

            </div>


            {/* SHOP */}

            <div className="col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Received from Shops
                  </p>

                  <h3 className="fw-bold mb-0">
                    ₹{paymentsReport.summary.shopPayments ?? 0}
                  </h3>

                </div>

              </div>

            </div>


            {/* DISTRIBUTOR */}

            <div className="col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Paid to Distributors
                  </p>

                  <h3 className="fw-bold mb-0">
                    ₹{paymentsReport.summary.distributorPayments ?? 0}
                  </h3>

                </div>

              </div>

            </div>


            {/* CASH RECEIVED */}

            <div className="col-md-3">

              <div className="card border-0 shadow-sm">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Cash Received
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹{paymentsReport.summary.cashReceived ?? 0}
                  </h5>

                </div>

              </div>

            </div>


            {/* GPAY RECEIVED */}

            <div className="col-md-3">

              <div className="card border-0 shadow-sm">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    GPay Received
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹{paymentsReport.summary.gpayReceived ?? 0}
                  </h5>

                </div>

              </div>

            </div>


            {/* CASH PAID */}

            <div className="col-md-3">

              <div className="card border-0 shadow-sm">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Cash Paid
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹{paymentsReport.summary.cashPaid ?? 0}
                  </h5>

                </div>

              </div>

            </div>


            {/* GPAY PAID */}

            <div className="col-md-3">

              <div className="card border-0 shadow-sm">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    GPay Paid
                  </p>

                  <h5 className="fw-bold mb-0">
                    ₹{paymentsReport.summary.gpayPaid ?? 0}
                  </h5>

                </div>

              </div>

            </div>

          </div>


          {/* --------------------------------------------- */}
          {/* PAYMENT DETAILS */}
          {/* --------------------------------------------- */}

          <div className="card border-0 shadow-sm mb-4">

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

                    {paymentsReport.payments?.length === 0 ? (

                      <tr>

                        <td
                          colSpan="5"
                          className="text-center text-muted py-4"
                        >
                          No payments found for this period.
                        </td>

                      </tr>

                    ) : (

                      paymentsReport.payments?.map((payment) => {

                        const partyName =
                          payment.partyType === "shop"
                            ? payment.shop?.name
                            : payment.distributor?.name;

                        return (

                          <tr key={payment._id}>

                            <td>
                              {payment.paymentDate
                                ? new Date(
                                    payment.paymentDate
                                  ).toLocaleDateString("en-IN")
                                : "-"}
                            </td>

                            <td className="fw-semibold">
                              {partyName || "-"}
                            </td>

                            <td>
                              <span className="text-capitalize">
                                {payment.partyType || "-"}
                              </span>
                            </td>

                            <td>
                              <span className="text-uppercase">
                                {payment.paymentMethod || "-"}
                              </span>
                            </td>

                            <td className="text-end fw-semibold">
                              ₹{payment.amount ?? 0}
                            </td>

                          </tr>

                        );

                      })

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        </>

      )}


      {/* ================================================= */}
      {/* STOCK REPORT */}
      {/* ================================================= */}

      {stockReport?.summary && (
        <>

          <h4 className="fw-bold mb-3">
            Stock Summary
          </h4>


          <div className="row g-3 mb-4">

            {/* PURCHASED */}

            <div className="col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Purchased
                  </p>

                  <h4 className="fw-bold mb-0">
                    {stockReport.summary.purchaseQuantity ?? 0} kg
                  </h4>

                </div>

              </div>

            </div>


            {/* SALES */}

            <div className="col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Sales / Delivered
                  </p>

                  <h4 className="fw-bold mb-0">
                    {stockReport.summary.salesQuantity ?? 0} kg
                  </h4>

                </div>

              </div>

            </div>


            {/* NET */}

            <div className="col-md-4">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-body">

                  <p className="text-muted mb-1">
                    Net Movement
                  </p>

                  <h4 className="fw-bold mb-0">
                    {stockReport.summary.netMovement ?? 0} kg
                  </h4>

                </div>

              </div>

            </div>

          </div>


          {/* --------------------------------------------- */}
          {/* STOCK BY PRODUCT */}
          {/* --------------------------------------------- */}

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
                        <th>Sales</th>
                        <th>Adjustments</th>
                        <th>Net Movement</th>
                        <th>Current Stock</th>
                      </tr>

                    </thead>


                    <tbody>

                      {stockReport.byProduct.length === 0 ? (

                        <tr>

                          <td
                            colSpan="7"
                            className="text-center text-muted py-4"
                          >
                            No stock movement found for this period.
                          </td>

                        </tr>

                      ) : (

                        stockReport.byProduct.map((item, index) => (

                          <tr key={item.productId || index}>

                            <td className="fw-semibold">
                              {item.productName ||
                                item.name ||
                                "-"}
                            </td>

                            <td>
                              {item.brand || "-"}
                            </td>

                            <td>
                              {item.purchaseQuantity ?? 0} kg
                            </td>

                            <td>
                              {item.salesQuantity ?? 0} kg
                            </td>

                            <td>
                              {item.adjustmentQuantity ?? 0} kg
                            </td>

                            <td className="fw-semibold">
                              {item.netMovement ?? 0} kg
                            </td>

                            <td className="fw-bold">
                              {item.currentStock ?? 0} kg
                            </td>

                          </tr>

                        ))

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          )}

        </>

      )}

    </div>
  );
}

export default Reports;