
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  EditToggle,
  ActionsHeader,
  ActionsCell,
  EditModal,
  deleteEntry,
  SearchBox,
  matchesSearch,
  indiaDate,
  SearchSelect,
  todayIndia,
  newestFirst,
} from "../components/EditTools";

function Payments() {
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const getToday = () => {
    return todayIndia();
  };

  const [payments, setPayments] = useState([]);
  const [shops, setShops] = useState([]);
  const [distributors, setDistributors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [outstandingLoading, setOutstandingLoading] = useState(false);

  const [showShopForm, setShowShopForm] = useState(false);
  const [showDistributorForm, setShowDistributorForm] = useState(false);

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

      const sortedPayments = [...response.data].sort((a, b) => {
        const dateA = new Date(a.paymentDate || a.createdAt);
        const dateB = new Date(b.paymentDate || b.createdAt);

        if (dateB - dateA !== 0) {
          return dateB - dateA;
        }

        return (
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
        );
      });

      setPayments(sortedPayments);
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
  // OPEN SHOP FORM
  // ==============================

  const openShopForm = () => {
    setError("");
    setSuccess("");
    setOutstanding(null);

    setFormData({
      partyType: "shop",
      party: "",
      amount: "",
      paymentMethod: "cash",
      paymentDate: getToday(),
      reference: "",
      notes: "",
    });

    setShowDistributorForm(false);
    setShowShopForm(true);
  };

  // ==============================
  // OPEN DISTRIBUTOR FORM
  // ==============================

  const openDistributorForm = () => {
    setError("");
    setSuccess("");
    setOutstanding(null);

    setFormData({
      partyType: "distributor",
      party: "",
      amount: "",
      paymentMethod: "cash",
      paymentDate: getToday(),
      reference: "",
      notes: "",
    });

    setShowShopForm(false);
    setShowDistributorForm(true);
  };

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
    setShowShopForm(false);
    setShowDistributorForm(false);
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

    if (!window.confirm("Save this entry?")) {
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

      setSuccess(
        formData.partyType === "shop"
          ? "Shop payment recorded successfully!"
          : "Distributor payment recorded successfully!"
      );

      await fetchPayments();

      await fetchOutstanding(
        formData.partyType,
        formData.party
      );

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

  const shopPayments = payments.filter(
    (payment) => payment.partyType === "shop"
  );

  const distributorPayments = payments.filter(
    (payment) => payment.partyType === "distributor"
  );

  const shopCashTotal = shopPayments
    .filter(
      (payment) => payment.paymentMethod === "cash"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  const shopGpayTotal = shopPayments
    .filter(
      (payment) => payment.paymentMethod === "gpay"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  const distributorCashTotal = distributorPayments
    .filter(
      (payment) => payment.paymentMethod === "cash"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  const distributorGpayTotal = distributorPayments
    .filter(
      (payment) => payment.paymentMethod === "gpay"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  const shopGrandTotal =
    shopCashTotal + shopGpayTotal;

  const distributorGrandTotal =
    distributorCashTotal +
    distributorGpayTotal;

  // Money received from shops is money IN, money paid to
  // distributors is money OUT, so the overall figure is the
  // difference (net), not the sum.
  const cashTotal =
    shopCashTotal - distributorCashTotal;

  const gpayTotal =
    shopGpayTotal - distributorGpayTotal;

  const formatNet = (value) =>
    `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString(
      "en-IN"
    )}`;

  const netClass = (value) =>
    value < 0 ? "text-danger" : value > 0 ? "text-success" : "";

  const grandTotal =
    shopGrandTotal - distributorGrandTotal;

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
  // OUTSTANDING AMOUNT
  // ==============================

  const getOutstandingAmount = () => {
    if (!outstanding) {
      return 0;
    }

    return Number(outstanding.outstanding || 0);
  };

  // ==============================
  // PAYMENT FORM
  // ==============================

  const renderPaymentForm = () => {
    const isShop = formData.partyType === "shop";

    const partyOptions = isShop
      ? shops
      : distributors;

    return (
      <div className="card shadow-sm mb-4">

        <div className="card-body">

          <div className="d-flex justify-content-between align-items-center mb-4">

            <h5 className="mb-0">
              {isShop
                ? "Record Shop Payment"
                : "Record Distributor Payment"}
            </h5>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={resetForm}
              disabled={formLoading}
            >
              Cancel
            </button>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="row">

              {/* PARTY */}

              <div className="col-md-4 mb-3">

                <label className="form-label">
                  {isShop
                    ? "Shop"
                    : "Distributor"}{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <SearchSelect
                  name="party"
                  value={formData.party}
                  onChange={handleChange}
                  className="form-select"
                  required
                >

                  <option value="">
                    Select{" "}
                    {isShop
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

                </SearchSelect>

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

              {/* PAYMENT METHOD */}

              <div className="col-md-4 mb-3">

                <label className="form-label">
                  Payment Method{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <SearchSelect
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

                </SearchSelect>

              </div>

              {/* OUTSTANDING */}

              {formData.party && (
                <div className="col-12 mb-3">

                  <div className="card border-info">

                    <div className="card-body py-3">

                      <div className="d-flex justify-content-between align-items-center">

                        <div>

                          <small className="text-muted d-block">

                            {isShop
                              ? "Current Shop Receivable"
                              : "Current Distributor Payable"}

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

              <div className="col-md-4 mb-3">

                <label className="form-label">
                  Notes
                </label>

                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Optional"
                />

              </div>

            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={formLoading}
            >
              {formLoading
                ? "Saving..."
                : isShop
                ? "Record Shop Payment"
                : "Record Distributor Payment"}
            </button>

          </form>

        </div>

      </div>
    );
  };

  // ==============================
  // PAYMENT TABLE
  // ==============================

  const renderPaymentTable = (
    paymentList,
    emptyMessage
  ) => {
    if (paymentList.length === 0) {
      return (
        <div className="alert alert-info">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="card shadow-sm">

        <div className="card-body p-0">

          <div className="table-responsive">

            <table className="table table-hover mb-0">

              <thead className="table-light">

                <tr>

                  <th>Party</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Notes</th>

                <ActionsHeader editMode={editMode} />
</tr>

              </thead>

              <tbody>

                {newestFirst(paymentList, "paymentDate").filter(matchesSearch(search)).map((payment) => (

                  <tr key={payment._id}>

                    <td>
                      <strong>
                        {getPartyName(payment)}
                      </strong>
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
                          payment.paymentMethod ===
                          "cash"
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

                  <ActionsCell
  editMode={editMode}
  onEdit={() => setEditing(payment)}
  onDelete={() =>
    deleteEntry({ path: "/payments", id: payment._id, label: "payment", onDone: fetchPayments })
  }
/>
</tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    );
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div className="container py-4">

        <h2>
          Payments
        </h2>

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
            Manage money received from shops and money paid to distributors.
          </p>

        </div>

      </div>

      {/* ERROR */}

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <SearchBox value={search} onChange={setSearch} />
        <EditToggle editMode={editMode} setEditMode={setEditMode} />
      </div>

{editing && (
        <EditModal
          title="Edit Payment"
          path="/payments"
          record={editing}
          fields={[
            {
              name: "partyType",
              label: "Payment type",
              type: "select",
              required: true,
              options: [
                { value: "shop", label: "Received from shop" },
                { value: "distributor", label: "Paid to distributor" },
              ],
            },
            {
              name: "shop",
              label: "Shop",
              type: "select",
              required: true,
              showIf: (v) => v.partyType === "shop",
              options: shops.map((x) => ({ value: x._id, label: x.name })),
            },
            {
              name: "distributor",
              label: "Distributor",
              type: "select",
              required: true,
              showIf: (v) => v.partyType === "distributor",
              options: distributors.map((x) => ({ value: x._id, label: x.name })),
            },
            { name: "amount", label: "Amount (₹)", type: "number", required: true },
            {
              name: "paymentMethod",
              label: "Payment method",
              type: "select",
              required: true,
              options: [
                { value: "cash", label: "Cash" },
                { value: "gpay", label: "GPay" },
              ],
            },
            { name: "paymentDate", label: "Date", type: "date", required: true },
            { name: "reference", label: "Reference" },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initialValues={{
            partyType: editing.partyType,
            shop: editing.shop?._id || "",
            distributor: editing.distributor?._id || "",
            amount: editing.amount,
            paymentMethod: editing.paymentMethod,
            paymentDate: indiaDate(editing.paymentDate),
            reference: editing.reference || "",
            notes: editing.notes || "",
          }}
          transform={(v) => ({
            partyType: v.partyType,
            shop: v.partyType === "shop" ? v.shop : undefined,
            distributor: v.partyType === "distributor" ? v.distributor : undefined,
            amount: Number(v.amount),
            paymentMethod: v.paymentMethod,
            paymentDate: v.paymentDate,
            reference: v.reference,
            notes: v.notes,
          })}
          onSaved={fetchPayments}
          onClose={() => setEditing(null)}
        />
      )}

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

      {/* PAYMENT FORMS */}

      {showShopForm &&
        renderPaymentForm()}

      {showDistributorForm &&
        renderPaymentForm()}

      {/* SHOP PAYMENTS */}

      <div className="mb-5">

        <div className="d-flex justify-content-between align-items-center mb-3">

          <div>

            <h4 className="mb-1">
              Shop Payments
            </h4>

            <p className="text-muted mb-0">
              Money received from shops.
            </p>

          </div>

          {!showShopForm &&
            !showDistributorForm && (
              <button
                className="btn btn-success"
                onClick={openShopForm}
              >
                + Record Shop Payment
              </button>
            )}

        </div>

        <div className="row mb-3">

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  Cash Received
                </p>

                <h4 className="mb-0">
                  ₹
                  {shopCashTotal.toLocaleString(
                    "en-IN"
                  )}
                </h4>

              </div>

            </div>

          </div>

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  GPay Received
                </p>

                <h4 className="mb-0">
                  ₹
                  {shopGpayTotal.toLocaleString(
                    "en-IN"
                  )}
                </h4>

              </div>

            </div>

          </div>

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  Total Received
                </p>

                <h4 className="mb-0">
                  ₹
                  {shopGrandTotal.toLocaleString(
                    "en-IN"
                  )}
                </h4>

              </div>

            </div>

          </div>

        </div>

        {renderPaymentTable(
          shopPayments,
          "No shop payments found."
        )}

      </div>

      {/* DISTRIBUTOR PAYMENTS */}

      <div className="mb-5">

        <div className="d-flex justify-content-between align-items-center mb-3">

          <div>

            <h4 className="mb-1">
              Distributor Payments
            </h4>

            <p className="text-muted mb-0">
              Money paid to distributors.
            </p>

          </div>

          {!showShopForm &&
            !showDistributorForm && (
              <button
                className="btn btn-danger"
                onClick={openDistributorForm}
              >
                + Record Distributor Payment
              </button>
            )}

        </div>

        <div className="row mb-3">

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  Cash Paid
                </p>

                <h4 className="mb-0">
                  ₹
                  {distributorCashTotal.toLocaleString(
                    "en-IN"
                  )}
                </h4>

              </div>

            </div>

          </div>

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  GPay Paid
                </p>

                <h4 className="mb-0">
                  ₹
                  {distributorGpayTotal.toLocaleString(
                    "en-IN"
                  )}
                </h4>

              </div>

            </div>

          </div>

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  Total Paid
                </p>

                <h4 className="mb-0">
                  ₹
                  {distributorGrandTotal.toLocaleString(
                    "en-IN"
                  )}
                </h4>

              </div>

            </div>

          </div>

        </div>

        {renderPaymentTable(
          distributorPayments,
          "No distributor payments found."
        )}

      </div>

      {/* OVERALL CASH / GPAY SUMMARY */}

      <div>

        <div className="mb-3">

          <h4>
            Overall Payment Summary
          </h4>

          <p className="text-muted">
            Money received from shops minus money paid to distributors.
          </p>

        </div>

        <div className="row">

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  Cash (Net)
                </p>

                <h3 className={`mb-0 ${netClass(cashTotal)}`}>
{formatNet(cashTotal)}
</h3>
<small className="text-muted">
Received {formatNet(shopCashTotal)} · Paid {formatNet(distributorCashTotal)}
</small>

              </div>

            </div>

          </div>

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  GPay (Net)
                </p>

                <h3 className={`mb-0 ${netClass(gpayTotal)}`}>
{formatNet(gpayTotal)}
</h3>
<small className="text-muted">
Received {formatNet(shopGpayTotal)} · Paid {formatNet(distributorGpayTotal)}
</small>

              </div>

            </div>

          </div>

          <div className="col-md-4 mb-3">

            <div className="card shadow-sm h-100">

              <div className="card-body">

                <p className="text-muted mb-1">
                  Net Total
                </p>

                <h3 className={`mb-0 ${netClass(grandTotal)}`}>
{formatNet(grandTotal)}
</h3>
<small className="text-muted">
Received {formatNet(shopGrandTotal)} · Paid {formatNet(distributorGrandTotal)}
</small>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Payments;

