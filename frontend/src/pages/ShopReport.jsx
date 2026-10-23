import { useEffect, useState } from "react";
import api from "../services/api";
import { SearchSelect, unitOf } from "../components/EditTools";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const day = (date) => new Date(date).toLocaleDateString("en-IN");

const itemsTotal = (items, qtyKey) =>
  (items || []).reduce(
    (total, item) =>
      total + Number(item[qtyKey] || 0) * Number(item.pricePerKg || 0),
    0
  );

function ShopReport() {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/shops")
      .then((response) => setShops(response.data))
      .catch(() => setError("Failed to load shops."));
  }, []);

  useEffect(() => {
    if (!shopId) {
      setReport(null);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/party-reports/shop/${shopId}`, {
          params: { from: from || undefined, to: to || undefined },
        });

        setReport(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load report.");
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [shopId, from, to]);

  const summary = report?.summary;

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">Shop Report</h2>
          <p className="text-muted mb-0">
            Orders, deliveries, payments, returns, balance and stock of one shop.
          </p>
        </div>

        {report && (
          <button
            type="button"
            className="btn btn-outline-dark no-print"
            onClick={() => window.print()}
          >
            🖨️ Print / Save as PDF
          </button>
        )}
      </div>

      <div className="card shadow-sm mb-3 no-print">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-md-6">
              <label className="form-label">Shop</label>
              <SearchSelect
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className="form-select"
              >
                <option value="">Select Shop</option>
                {shops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.name} - {shop.ownerName}
                  </option>
                ))}
              </SearchSelect>
            </div>

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
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading report...</p>}

      {!report && !loading && !error && (
        <div className="alert alert-info">Select a shop to see its report.</div>
      )}

      {report && summary && (
        <>
          <h4 className="mb-1">{report.shop.name}</h4>
          <p className="text-muted">
            {report.shop.ownerName} •{" "}
            {from || to
              ? `${from ? day(from) : "Start"} to ${to ? day(to) : "Today"}`
              : "All dates"}
          </p>

          <div className="row g-2 mb-3">
            {[
              ["Balance at start", money(summary.balanceAtStart)],
              ["Total delivered", money(summary.totalDelivered)],
              ["Returns", money(summary.totalReturns)],
              ["Payments received", money(summary.totalPayments)],
              [
                summary.advance > 0 ? "Advance (shop paid extra)" : "Balance due",
                money(summary.advance > 0 ? summary.advance : summary.due),
              ],
            ].map(([label, value]) => (
              <div className="col-6 col-md" key={label}>
                <div className="stat-card">
                  <div className="stat-label">{label}</div>
                  <div className="stat-value" style={{ fontSize: "20px" }}>
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h5>Stock with this shop (all time)</h5>
              <p className="text-muted small mb-2">
                Delivered minus returned, product-wise (in each product's own unit).
              </p>

              {report.stock.length === 0 ? (
                <p className="text-muted mb-0">No deliveries yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Delivered</th>
                        <th>Returned</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.stock.map((row) => (
                        <tr key={row.product}>
                          <td>
                            {row.name} <small className="text-muted">({row.brand})</small>
                          </td>
                          <td>{row.delivered} {row.unit}</td>
                          <td>{row.returned} {row.unit}</td>
                          <td>
                            <strong>{row.stock} {row.unit}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <Section title="Orders" empty="No orders in this period." rows={report.orders}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Products</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.orders.map((order) => (
                <tr key={order._id}>
                  <td>{day(order.orderDate)}</td>
                  <td>
                    {order.items.map((item, i) => (
                      <div key={i}>
                        {item.product?.name} — {item.quantity} {unitOf(item.product)} @ ₹{item.pricePerKg}
                      </div>
                    ))}
                  </td>
                  <td>{money(itemsTotal(order.items, "quantity"))}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </Section>

          <Section title="Deliveries" empty="No deliveries in this period." rows={report.deliveries}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Products</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {report.deliveries.map((delivery) => (
                <tr key={delivery._id}>
                  <td>{day(delivery.deliveredAt)}</td>
                  <td>
                    {delivery.items.map((item, i) => (
                      <div key={i}>
                        {item.product?.name} — {item.quantityDelivered} {unitOf(item.product)} @ ₹{item.pricePerKg}
                      </div>
                    ))}
                  </td>
                  <td>{money(itemsTotal(delivery.items, "quantityDelivered"))}</td>
                </tr>
              ))}
            </tbody>
          </Section>

          <Section title="Payments" empty="No payments in this period." rows={report.payments}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {report.payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{day(payment.paymentDate)}</td>
                  <td>{payment.paymentMethod}</td>
                  <td>{money(payment.amount)}</td>
                  <td>{payment.notes || payment.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </Section>

          <Section title="Returns" empty="No returns in this period." rows={report.returns}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Products</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {report.returns.map((record) => (
                <tr key={record._id}>
                  <td>{day(record.returnDate)}</td>
                  <td>
                    {record.items.map((item, i) => (
                      <div key={i}>
                        {item.product?.name} — {item.quantity} {unitOf(item.product)}
                      </div>
                    ))}
                  </td>
                  <td>{money(itemsTotal(record.items, "quantity"))}</td>
                </tr>
              ))}
            </tbody>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, rows, children }) {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body">
        <h5>{title}</h5>

        {rows.length === 0 ? (
          <p className="text-muted mb-0">{empty}</p>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">{children}</table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopReport;
