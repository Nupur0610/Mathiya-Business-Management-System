import { useEffect, useState } from "react";
import api from "../services/api";

function StockAdjustments() {
  const [products, setProducts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState("decrease");
  const [reason, setReason] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [productsResponse, adjustmentsResponse] =
        await Promise.all([
          api.get("/products"),
          api.get("/stock-adjustments"),
        ]);

      setProducts(productsResponse.data || []);
      setAdjustments(adjustmentsResponse.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to load stock adjustments."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!product) {
      setError("Please select a product.");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (!reason.trim()) {
      setError("Please enter a reason.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/stock-adjustments", {
        product,
        quantity: Number(quantity),
        type,
        reason,
        adjustmentDate,
        notes,
      });

      setMessage("Stock adjustment created successfully.");

      setProduct("");
      setQuantity("");
      setType("decrease");
      setReason("");
      setNotes("");

      await fetchData();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to create stock adjustment."
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN");
  };

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="mb-1">Stock Adjustments</h2>

        <p className="text-muted mb-0">
          Correct stock when the physical quantity differs from
          the system quantity.
        </p>
      </div>

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        {/* Form */}
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-1">New Stock Adjustment</h5>

              <small className="text-muted">
                Use this when stock needs to be corrected without
                creating a sale, purchase, or delivery.
              </small>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Product
                  </label>

                  <select
                    className="form-select"
                    value={product}
                    onChange={(e) =>
                      setProduct(e.target.value)
                    }
                  >
                    <option value="">
                      Select product
                    </option>

                    {products.map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.name} - {item.brand}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Adjustment Type
                  </label>

                  <select
                    className="form-select"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value)
                    }
                  >
                    <option value="decrease">
                      Decrease Stock
                    </option>

                    <option value="increase">
                      Increase Stock
                    </option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Quantity
                  </label>

                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      min="0.001"
                      step="0.001"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value)
                      }
                      placeholder="Enter quantity"
                    />

                    <span className="input-group-text">
                      kg
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Reason
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value)
                    }
                    placeholder="Example: Physical stock count"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Date
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    value={adjustmentDate}
                    onChange={(e) =>
                      setAdjustmentDate(e.target.value)
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Notes
                  </label>

                  <textarea
                    className="form-control"
                    rows="3"
                    value={notes}
                    onChange={(e) =>
                      setNotes(e.target.value)
                    }
                    placeholder="Optional notes"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Adjustment"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="col-lg-7">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                When to Use Stock Adjustment
              </h5>
            </div>

            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h6 className="text-danger">
                      Decrease
                    </h6>

                    <p className="text-muted mb-0">
                      Use when physical stock is lower than
                      system stock because of wastage, damage,
                      missing stock, counting mistakes, etc.
                    </p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h6 className="text-success">
                      Increase
                    </h6>

                    <p className="text-muted mb-0">
                      Use when physical stock is higher than
                      system stock because of an earlier missed
                      entry or counting correction.
                    </p>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning mt-3 mb-0">
                Stock adjustments change inventory directly.
                They do not create a shop sale or distributor
                purchase.
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                Adjustment History
              </h5>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" />

                  <p className="text-muted mt-3 mb-0">
                    Loading adjustments...
                  </p>
                </div>
              ) : adjustments.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No stock adjustments recorded yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Reason</th>
                        <th>Notes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {adjustments.map((item) => (
                        <tr key={item._id}>
                          <td>
                            {formatDate(
                              item.adjustmentDate
                            )}
                          </td>

                          <td>
                            <strong>
                              {item.product?.name}
                            </strong>

                            <br />

                            <small className="text-muted">
                              {item.product?.brand}
                            </small>
                          </td>

                          <td>
                            {item.type === "decrease" ? (
                              <span className="badge bg-danger">
                                Decrease
                              </span>
                            ) : (
                              <span className="badge bg-success">
                                Increase
                              </span>
                            )}
                          </td>

                          <td className="fw-semibold">
                            {item.quantity} kg
                          </td>

                          <td>{item.reason}</td>

                          <td>
                            {item.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockAdjustments;