import { useEffect, useState } from "react";
import api from "../services/api";
import { indiaDate, errorMessage } from "../components/EditTools";

const rupees = (value) => {
  const number = Number(value || 0);

  return `${number < 0 ? "-" : ""}₹${Math.abs(number).toLocaleString(
    "en-IN"
  )}`;
};

const kg = (value) =>
  `${Number(value || 0).toLocaleString("en-IN")} kg`;

const monthName = (key) => {
  const [year, month] = key.split("-");

  return new Date(Number(year), Number(month) - 1, 1).toLocaleString(
    "en-IN",
    { month: "long", year: "numeric" }
  );
};

const money = (value) => (value < 0 ? "text-danger" : "text-success");

function Summary() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {};

        if (from) params.from = from;
        if (to) params.to = to;

        const response = await api.get("/summary", { params });

        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err, "Failed to load the summary."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);

    setFrom(indiaDate(first));
    setTo(indiaDate(now));
  };

  const setLastMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);

    setFrom(indiaDate(first));
    setTo(indiaDate(last));
  };

  const setAllTime = () => {
    setFrom("");
    setTo("");
  };

  const overall = data?.overall;

  const total = (rows, key) =>
    (rows || []).reduce((sum, row) => sum + Number(row[key] || 0), 0);

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2>Business Summary</h2>

        <p className="text-muted mb-0">
          Total sale, total purchase, party-wise totals and estimated
          profit.
        </p>
      </div>

      {/* DATE RANGE */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-6 col-md-3">
              <label className="form-label">From</label>
              <input
                type="date"
                className="form-control"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label">To</label>
              <input
                type="date"
                className="form-control"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={setThisMonth}
              >
                This month
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={setLastMonth}
              >
                Last month
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={setAllTime}
              >
                All time
              </button>
            </div>
          </div>

          <small className="text-muted d-block mt-2">
            Dates limit sale, purchase, payments and profit. Due and
            advance are always the balance as of today.
          </small>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && !data && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      )}

      {data && (
        <div style={{ opacity: loading ? 0.5 : 1 }}>
          {/* OVERALL */}

          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted">Total Sale (net)</h6>
                  <h3>{rupees(overall.netSale)}</h3>
                  <small className="text-muted">
                    Delivered {rupees(overall.sale)} - returns{" "}
                    {rupees(overall.saleReturns)}
                  </small>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted">Total Purchase (net)</h6>
                  <h3>{rupees(overall.netPurchase)}</h3>
                  <small className="text-muted">
                    Received {rupees(overall.purchase)} - returns{" "}
                    {rupees(overall.purchaseReturns)}
                  </small>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted">Estimated Profit</h6>
                  <h3 className={money(overall.estimatedProfit)}>
                    {rupees(overall.estimatedProfit)}
                  </h3>
                  <small className="text-muted">
                    Sale minus the buying cost of the stock sold
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-6 col-md-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted">Shops Owe Us</h6>
                  <h4 className="text-danger">{rupees(overall.shopDue)}</h4>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted">Advance from Shops</h6>
                  <h4 className="text-success">
                    {rupees(overall.shopAdvance)}
                  </h4>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted">We Owe Distributors</h6>
                  <h4 className="text-danger">
                    {rupees(overall.distributorDue)}
                  </h4>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted">Advance to Distributors</h6>
                  <h4 className="text-success">
                    {rupees(overall.distributorAdvance)}
                  </h4>
                </div>
              </div>
            </div>
          </div>

          {/* SHOP WISE SALE */}

          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">Sale per Shop</h5>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Shop</th>
                    <th className="text-end">Delivered</th>
                    <th className="text-end">Returns</th>
                    <th className="text-end">Net Sale</th>
                    <th className="text-end">Payments Received</th>
                    <th className="text-end">Due</th>
                    <th className="text-end">Advance</th>
                  </tr>
                </thead>

                <tbody>
                  {data.shops.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        No shops found.
                      </td>
                    </tr>
                  )}

                  {data.shops.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td className="text-end">{rupees(row.sale)}</td>
                      <td className="text-end">{rupees(row.returns)}</td>
                      <td className="text-end">
                        <strong>{rupees(row.netSale)}</strong>
                      </td>
                      <td className="text-end">{rupees(row.received)}</td>
                      <td className="text-end text-danger">
                        {row.due > 0 ? rupees(row.due) : "-"}
                      </td>
                      <td className="text-end text-success">
                        {row.advance > 0 ? rupees(row.advance) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {data.shops.length > 0 && (
                  <tfoot className="table-light">
                    <tr>
                      <th>Total</th>
                      <th className="text-end">
                        {rupees(total(data.shops, "sale"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.shops, "returns"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.shops, "netSale"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.shops, "received"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.shops, "due"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.shops, "advance"))}
                      </th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* DISTRIBUTOR WISE PURCHASE */}

          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">Purchase per Party (Distributor)</h5>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Distributor</th>
                    <th className="text-end">Received</th>
                    <th className="text-end">Returns</th>
                    <th className="text-end">Net Purchase</th>
                    <th className="text-end">Payments Made</th>
                    <th className="text-end">Due</th>
                    <th className="text-end">Advance</th>
                  </tr>
                </thead>

                <tbody>
                  {data.distributors.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        No distributors found.
                      </td>
                    </tr>
                  )}

                  {data.distributors.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td className="text-end">{rupees(row.purchase)}</td>
                      <td className="text-end">{rupees(row.returns)}</td>
                      <td className="text-end">
                        <strong>{rupees(row.netPurchase)}</strong>
                      </td>
                      <td className="text-end">{rupees(row.paid)}</td>
                      <td className="text-end text-danger">
                        {row.due > 0 ? rupees(row.due) : "-"}
                      </td>
                      <td className="text-end text-success">
                        {row.advance > 0 ? rupees(row.advance) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {data.distributors.length > 0 && (
                  <tfoot className="table-light">
                    <tr>
                      <th>Total</th>
                      <th className="text-end">
                        {rupees(total(data.distributors, "purchase"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.distributors, "returns"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.distributors, "netPurchase"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.distributors, "paid"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.distributors, "due"))}
                      </th>
                      <th className="text-end">
                        {rupees(total(data.distributors, "advance"))}
                      </th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* PROFIT PER PRODUCT */}

          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">Estimated Profit per Product</h5>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th className="text-end">Net Sold</th>
                    <th className="text-end">Sale Value</th>
                    <th className="text-end">Avg Buying / kg</th>
                    <th className="text-end">Buying Cost</th>
                    <th className="text-end">Profit</th>
                    <th className="text-end">Margin</th>
                  </tr>
                </thead>

                <tbody>
                  {data.products.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        No sales in this period.
                      </td>
                    </tr>
                  )}

                  {data.products.map((row) => (
                    <tr key={row.product}>
                      <td>
                        <strong>{row.name}</strong>
                        {row.brand && (
                          <small className="text-muted d-block">
                            {row.brand}
                          </small>
                        )}
                      </td>
                      <td className="text-end">{kg(row.netSoldKg)}</td>
                      <td className="text-end">{rupees(row.revenue)}</td>
                      <td className="text-end">
                        {row.costKnown ? (
                          rupees(row.averageCostPerKg)
                        ) : (
                          <span className="badge bg-warning text-dark">
                            No purchase found
                          </span>
                        )}
                      </td>
                      <td className="text-end">{rupees(row.cost)}</td>
                      <td className={`text-end ${money(row.profit)}`}>
                        <strong>{rupees(row.profit)}</strong>
                      </td>
                      <td className="text-end">{row.marginPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PROFIT PER MONTH */}

          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">Estimated Profit per Month</h5>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Month</th>
                    <th className="text-end">Sale Value</th>
                    <th className="text-end">Buying Cost</th>
                    <th className="text-end">Profit</th>
                  </tr>
                </thead>

                <tbody>
                  {data.months.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4">
                        No sales in this period.
                      </td>
                    </tr>
                  )}

                  {data.months.map((row) => (
                    <tr key={row.month}>
                      <td>
                        <strong>{monthName(row.month)}</strong>
                      </td>
                      <td className="text-end">{rupees(row.revenue)}</td>
                      <td className="text-end">{rupees(row.cost)}</td>
                      <td className={`text-end ${money(row.profit)}`}>
                        <strong>{rupees(row.profit)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alert alert-light border">
            <strong>How profit is worked out:</strong> sale value (delivered
            minus shop returns) minus the buying cost of those kg. The
            buying cost per kg is the average price of everything you
            received from distributors (after returns to them). Opening
            stock has no price saved, so it is costed at that same average.
            This is an estimate, not an accounting profit: it does not
            include transport, salaries, rent or other expenses.
          </div>
        </div>
      )}
    </div>
  );
}

export default Summary;
