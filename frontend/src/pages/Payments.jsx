
import { useEffect, useState } from "react";
import api from "../services/api";

function Payments() {
  const getToday = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [payments, setPayments] = useState([]);
  const [shops, setShops] = useState([]);
  const [distributors, setDistributors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [outstandingLoading, setOutstandingLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [outstanding, setOutstanding] = useState(null);

  const [formData, setFormData] = useState({
    partyType: "shop",
    party: "",
    amount: "",
    paymentMethod: "cash",
    paymentDate: getToday(),
    reference: "",
    notes: "",
  });

  // ==============================
  // FETCH PAYMENTS
  // ==============================

  const fetchPayments = async () => {
    try {
      const response = await api.get("/payments");
      setPayments(response.data);
    } catch (err) {
      console.error("Error fetching payments:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load payments."
      );
    }
  };

  // ==============================
  // FETCH SHOPS
  // ==============================

  const fetchShops = async () => {
    try {
      const response = await api.get("/shops");
      setShops(response.data);
    } catch (err) {
      console.error("Error fetching shops:", err);

      setError("Failed to load shops.");
    }
  };

  // ==============================
  // FETCH DISTRIBUTORS
  // ==============================

  const fetchDistributors = async () => {
    try {
      const response = await api.get("/distributors");
      setDistributors(response.data);
    } catch (err) {
      console.error("Error fetching distributors:", err);

      setError("Failed to load distributors.");
    }
  };

  // ==============================
  // FETCH OUTSTANDING
  // ==============================

  const fetchOutstanding = async (partyType, partyId) => {
    if (!partyType || !partyId) {
      setOutstanding(null);
      return;
    }

    try {
      setOutstandingLoading(true);
      setError("");

      let response;

      if (partyType === "shop") {
        response = await api.get(
          `/outstanding/shops/${partyId}`
        );
      } else {
        response = await api.get(
          `/outstanding/distributors/${partyId}`
        );
      }

      setOutstanding(response.data);
    } catch (err) {
      console.error("Error fetching outstanding:", err);

      setOutstanding(null);

      setError(
        err.response?.data?.message ||
          "Failed to load outstanding."
      );
    } finally {
      setOutstandingLoading(false);
    }
  };

  // ==============================
  // LOAD DATA
  // ==============================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchPayments(),
        fetchShops(),
        fetchDistributors(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // ==============================
  // HANDLE FORM CHANGE
  // ==============================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "party") {
      fetchOutstanding(formData.partyType, value);
    }
  };

  // ==============================
  // HANDLE PARTY TYPE CHANGE
  // ==============================

  const handlePartyTypeChange = (e) => {
    const value = e.target.value;

    setFormData((previous) => ({
      ...previous,
      partyType: value,
      party: "",
    }));

    setOutstanding(null);
  };

  // ==============================
  // RESET FORM
  // ==============================

  const resetForm = () => {
    setFormData({
      partyType: "shop",
      party: "",
      amount: "",
      paymentMethod: "cash",
      paymentDate: getToday(),
      reference: "",
      notes: "",
    });

    setOutstanding(null);
    setShowForm(false);
    setError("");
  };

  // ==============================
  // CREATE PAYMENT
  // ==============================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.partyType ||
      !formData.party ||
      !formData.amount ||
      !formData.paymentMethod
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (Number(formData.amount) <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    try {
      setFormLoading(true);

      const paymentData = {
        partyType: formData.partyType,

        amount: Number(formData.amount),

        paymentMethod: formData.paymentMethod,

        paymentDate: formData.paymentDate
          ? new Date(formData.paymentDate).toISOString()
          : new Date().toISOString(),

        reference: formData.reference,
        notes: formData.notes,
      };

      if (formData.partyType === "shop") {
        paymentData.shop = formData.party;
      } else {
        paymentData.distributor = formData.party;
      }

      await api.post("/payments", paymentData);

      setSuccess("Payment recorded successfully!");

      // Refresh payment history
      await fetchPayments();

      // Refresh outstanding
      await fetchOutstanding(
        formData.partyType,
        formData.party
      );

      // Clear payment-specific fields
      setFormData((previous) => ({
        ...previous,
        amount: "",
        reference: "",
        notes: "",
        paymentDate: getToday(),
      }));
    } catch (err) {
      console.error("Error creating payment:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to record payment."
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ==============================
  // FORMAT DATE
  // ==============================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString("en-IN");
  };

  // ==============================
  // TOTALS
  // ==============================

  const cashTotal = payments
    .filter(
      (payment) => payment.paymentMethod === "cash"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  const gpayTotal = payments
    .filter(
      (payment) => payment.paymentMethod === "gpay"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  const grandTotal = cashTotal + gpayTotal;

  // ==============================
  // PARTY NAME
  // ==============================

  const getPartyName = (payment) => {
    if (payment.partyType === "shop") {
      return payment.shop?.name || "Unknown Shop";
    }

    if (payment.partyType === "distributor") {
      return (
        payment.distributor?.name ||
        "Unknown Distributor"
      );
    }

    return "Unknown";
  };

  // ==============================
  // PARTY OPTIONS
  // ==============================

  const partyOptions =
    formData.partyType === "shop"
      ? shops
      : distributors;

  // ==============================
  // OUTSTANDING AMOUNT
  // ==============================

  const getOutstandingAmount = () => {
    if (!outstanding) {
      return 0;
    }

    return Number(outstanding.outstanding || 0);
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div className="container py-4">
        <h2>Payments</h2>

        <p className="text-muted">
          Loading payments...
        </p>
      </div>
    );
  }

  // ==============================
  // UI
  // ==============================

  return (
    <div className="container py-4">

      {/* HEADER */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h2 className="mb-1">
            Payments
          </h2>

          <p className="text-muted mb-0">
            Track cash and GPay payments.
          </p>
        </div>

        {!showForm && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm(true);
            }}
          >
            + Record Payment
          </button>
        )}

      </div>

      {/* ERROR */}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* PAYMENT FORM */}

      {showForm && (
        <div className="card shadow-sm mb-4">

          <div className="card-body">

            <h5 className="mb-4">
              Record Payment
            </h5>

            <form onSubmit={handleSubmit}>

              <div className="row">

                {/* PARTY TYPE */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Party Type{" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <select
                    name="partyType"
                    value={formData.partyType}
                    onChange={handlePartyTypeChange}
                    className="form-select"
                    required
                  >
                    <option value="shop">
                      Shop
                    </option>

                    <option value="distributor">
                      Distributor
                    </option>
                  </select>

                </div>

                {/* PARTY */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">

                    {formData.partyType === "shop"
                      ? "Shop"
                      : "Distributor"}

                    {" "}

                    <span className="text-danger">
                      *
                    </span>

                  </label>

                  <select
                    name="party"
                    value={formData.party}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >

                    <option value="">
                      Select{" "}
                      {formData.partyType === "shop"
                        ? "Shop"
                        : "Distributor"}
                    </option>

                    {partyOptions.map((party) => (
                      <option
                        key={party._id}
                        value={party._id}
                      >
                        {party.name}
                      </option>
                    ))}

                  </select>

                </div>

                {/* AMOUNT */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Amount (₹){" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="form-control"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    required
                  />

                </div>

                {/* OUTSTANDING */}

                {formData.party && (
                  <div className="col-12 mb-3">

                    <div className="card border-info">

                      <div className="card-body py-3">

                        <div className="d-flex justify-content-between align-items-center">

                          <div>

                            <small className="text-muted d-block">

                              Current{" "}

                              {formData.partyType === "shop"
                                ? "Shop Receivable"
                                : "Distributor Payable"}

                            </small>

                            <h4 className="mb-0">

                              {outstandingLoading
                                ? "Loading..."
                                : `₹${getOutstandingAmount().toLocaleString(
                                    "en-IN"
                                  )}`}

                            </h4>

                          </div>

                          {formData.amount &&
                            outstanding &&
                            !outstandingLoading && (

                              <div className="text-end">

                                <small className="text-muted d-block">
                                  After this payment
                                </small>

                                <strong>

                                  ₹
                                  {Math.max(
                                    getOutstandingAmount() -
                                      Number(
                                        formData.amount
                                      ),
                                    0
                                  ).toLocaleString(
                                    "en-IN"
                                  )}

                                </strong>

                              </div>

                            )}

                        </div>

                      </div>

                    </div>

                  </div>
                )}

                {/* PAYMENT METHOD */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Payment Method{" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >

                    <option value="cash">
                      Cash
                    </option>

                    <option value="gpay">
                      GPay
                    </option>

                  </select>

                </div>

                {/* PAYMENT DATE */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Payment Date
                  </label>

                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    className="form-control"
                  />

                </div>

                {/* REFERENCE */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Reference
                  </label>

                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Optional"
                  />

                </div>

                {/* NOTES */}

                <div className="col-12 mb-3">

                  <label className="form-label">
                    Notes
                  </label>

                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-control"
                    rows="3"
                    placeholder="Optional notes"
                  />

                </div>

              </div>

              {/* BUTTONS */}

              <div className="d-flex gap-2">

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Saving..."
                    : "Record Payment"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={formLoading}
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* PAYMENT SUMMARY */}

      <div className="row mb-4">

        <div className="col-md-4 mb-3">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <p className="text-muted mb-1">
                Cash Payments
              </p>

              <h3 className="mb-0">
                ₹
                {cashTotal.toLocaleString("en-IN")}
              </h3>

            </div>

          </div>

        </div>

        <div className="col-md-4 mb-3">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <p className="text-muted mb-1">
                GPay Payments
              </p>

              <h3 className="mb-0">
                ₹
                {gpayTotal.toLocaleString("en-IN")}
              </h3>

            </div>

          </div>

        </div>

        <div className="col-md-4 mb-3">

          <div className="card shadow-sm h-100">

            <div className="card-body">

              <p className="text-muted mb-1">
                Total Payments
              </p>

              <h3 className="mb-0">
                ₹
                {grandTotal.toLocaleString("en-IN")}
              </h3>

            </div>

          </div>

        </div>

      </div>

      {/* PAYMENT HISTORY */}

      <div className="mb-3">

        <h4>
          Payment History
        </h4>

        <p className="text-muted">
          All recorded payments.
        </p>

      </div>

      {payments.length === 0 ? (

        <div className="alert alert-info">
          No payments found.
        </div>

      ) : (

        <div className="card shadow-sm">

          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-hover mb-0">

                <thead className="table-light">

                  <tr>

                    <th>Party</th>

                    <th>Type</th>

                    <th>Amount</th>

                    <th>Payment Method</th>

                    <th>Date</th>

                    <th>Reference</th>

                    <th>Notes</th>

                  </tr>

                </thead>

                <tbody>

                  {payments.map((payment) => (

                    <tr key={payment._id}>

                      <td>
                        <strong>
                          {getPartyName(payment)}
                        </strong>
                      </td>

                      <td>
                        <span className="text-capitalize">
                          {payment.partyType}
                        </span>
                      </td>

                      <td>
                        <strong>
                          ₹
                          {Number(
                            payment.amount || 0
                          ).toLocaleString("en-IN")}
                        </strong>
                      </td>

                      <td>

                        <span
                          className={`badge ${
                            payment.paymentMethod === "cash"
                              ? "bg-success"
                              : "bg-primary"
                          }`}
                        >
                          {payment.paymentMethod}
                        </span>

                      </td>

                      <td>
                        {formatDate(
                          payment.paymentDate
                        )}
                      </td>

                      <td>
                        {payment.reference || "-"}
                      </td>

                      <td>
                        {payment.notes || "-"}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Payments;

