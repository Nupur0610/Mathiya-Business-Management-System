import { useEffect, useState } from "react";
import api from "../services/api";

function CashTransactions() {
  const [transactions, setTransactions] = useState([]);

  const [type, setType] = useState("personal_contribution");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const response = await api.get("/cash-transactions");

      setTransactions(response.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to load cash transactions."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/cash-transactions", {
        type,
        amount: Number(amount),
        paymentMethod,
        transactionDate,
        notes,
      });

      setMessage("Transaction added successfully.");

      setAmount("");
      setNotes("");

      await fetchTransactions();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to add transaction."
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN");
  };

  const formatAmount = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="mb-1">Cash Transactions</h2>

        <p className="text-muted mb-0">
          Record personal contributions and withdrawals made
          through business cash or GPay.
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
        {/* Add Transaction */}
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-1">Add Transaction</h5>

              <small className="text-muted">
                Personal money movement only. This is not business
                income or expense.
              </small>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Type */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Transaction Type
                  </label>

                  <select
                    className="form-select"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value)
                    }
                  >
                    <option value="personal_contribution">
                      Personal Contribution
                    </option>

                    <option value="personal_withdrawal">
                      Personal Withdrawal
                    </option>
                  </select>
                </div>

                {/* Payment Method */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Payment Method
                  </label>

                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value)
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="gpay">GPay</option>
                  </select>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Amount
                  </label>

                  <div className="input-group">
                    <span className="input-group-text">
                      ₹
                    </span>

                    <input
                      type="number"
                      className="form-control"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value)
                      }
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Date
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    value={transactionDate}
                    onChange={(e) =>
                      setTransactionDate(e.target.value)
                    }
                  />
                </div>

                {/* Notes */}
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
                    placeholder={
                      type === "personal_contribution"
                        ? "Example: Added personal cash to business"
                        : "Example: Cash taken for personal use"
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Add Transaction"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="col-lg-7">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                How This Affects Silaak
              </h5>
            </div>

            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h6 className="text-success">
                      Personal Contribution
                    </h6>

                    <p className="mb-0 text-muted">
                      Money added from personal funds increases
                      the available business cash or GPay balance.
                    </p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h6 className="text-danger">
                      Personal Withdrawal
                    </h6>

                    <p className="mb-0 text-muted">
                      Money taken from the business for personal
                      use decreases the available cash or GPay
                      balance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="alert alert-info mt-3 mb-0">
                These transactions are not counted as business
                sales, purchases, income, or expenses.
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                Transaction History
              </h5>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" />

                  <p className="text-muted mt-3 mb-0">
                    Loading transactions...
                  </p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No cash transactions recorded yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Notes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction._id}>
                          <td>
                            {formatDate(
                              transaction.transactionDate
                            )}
                          </td>

                          <td>
                            {transaction.type ===
                            "personal_contribution" ? (
                              <span className="badge bg-success">
                                Contribution
                              </span>
                            ) : (
                              <span className="badge bg-danger">
                                Withdrawal
                              </span>
                            )}
                          </td>

                          <td>
                            {transaction.paymentMethod ===
                            "cash"
                              ? "Cash"
                              : "GPay"}
                          </td>

                          <td className="fw-semibold">
                            {formatAmount(
                              transaction.amount
                            )}
                          </td>

                          <td>
                            {transaction.notes || "-"}
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

export default CashTransactions;