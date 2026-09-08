import { useEffect, useState } from "react";
import api from "../services/api";

function getTodayDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

function OpeningBalances() {
  const [balances, setBalances] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [distributors, setDistributors] = useState([]);

  const [form, setForm] = useState({
    type: "cash",
    amount: "",
    quantity: "",
    product: "",
    shop: "",
    distributor: "",
    asOfDate: getTodayDate(),
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setPageLoading(true);

      const [
        balancesResponse,
        productsResponse,
        shopsResponse,
        distributorsResponse,
      ] = await Promise.all([
        api.get("/opening-balances"),
        api.get("/products"),
        api.get("/shops"),
        api.get("/distributors"),
      ]);

      setBalances(balancesResponse.data || []);
      setProducts(productsResponse.data || []);
      setShops(shopsResponse.data || []);
      setDistributors(distributorsResponse.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load opening balance data."
      );
    } finally {
      setPageLoading(false);
    }
  };

  const handleTypeChange = (e) => {
    setForm({
      type: e.target.value,
      amount: "",
      quantity: "",
      product: "",
      shop: "",
      distributor: "",
      asOfDate: form.asOfDate,
      notes: "",
    });

    setMessage("");
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        type: form.type,
        asOfDate: form.asOfDate,
        notes: form.notes.trim(),
      };

      if (
        form.type === "cash" ||
        form.type === "gpay" ||
        form.type === "shop_receivable" ||
        form.type === "distributor_payable"
      ) {
        payload.amount = Number(form.amount);
      }

      if (form.type === "stock") {
        payload.product = form.product;
        payload.quantity = Number(form.quantity);
      }

      if (form.type === "shop_receivable") {
        payload.shop = form.shop;
      }

      if (form.type === "distributor_payable") {
        payload.distributor = form.distributor;
      }

      await api.post("/opening-balances", payload);

      setMessage("Opening balance added successfully.");

      setForm({
        type: form.type,
        amount: "",
        quantity: "",
        product: "",
        shop: "",
        distributor: "",
        asOfDate: form.asOfDate,
        notes: "",
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to add opening balance."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN");
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "cash":
        return "Cash";
      case "gpay":
        return "GPay";
      case "stock":
        return "Stock";
      case "shop_receivable":
        return "Shop Receivable";
      case "distributor_payable":
        return "Distributor Payable";
      default:
        return type;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "cash":
        return "bg-success";
      case "gpay":
        return "bg-primary";
      case "stock":
        return "bg-warning text-dark";
      case "shop_receivable":
        return "bg-info text-dark";
      case "distributor_payable":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  const getDetails = (balance) => {
    if (balance.type === "stock") {
      if (!balance.product) return "-";

      return `${balance.product.name}${
        balance.product.brand
          ? ` - ${balance.product.brand}`
          : ""
      }`;
    }

    if (balance.type === "shop_receivable") {
      return balance.shop?.name || "-";
    }

    if (balance.type === "distributor_payable") {
      return balance.distributor?.name || "-";
    }

    return "Business balance";
  };

  const cashOpening = balances.find(
    (balance) => balance.type === "cash"
  );

  const gpayOpening = balances.find(
    (balance) => balance.type === "gpay"
  );

  const totalReceivable = balances
    .filter((balance) => balance.type === "shop_receivable")
    .reduce(
      (total, balance) => total + Number(balance.amount || 0),
      0
    );

  const totalPayable = balances
    .filter((balance) => balance.type === "distributor_payable")
    .reduce(
      (total, balance) => total + Number(balance.amount || 0),
      0
    );

  const totalOpeningStock = balances
    .filter((balance) => balance.type === "stock")
    .reduce(
      (total, balance) => total + Number(balance.quantity || 0),
      0
    );

  if (pageLoading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
          <p className="mt-3 text-muted">
            Loading opening balances...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="mb-4">
        <h2 className="mb-1">Opening Balances</h2>

        <p className="text-muted mb-0">
          Set the balances that existed when the business started using
          this system.
        </p>
      </div>

      {/* Explanation */}
      <div className="alert alert-info mb-4">
        <h6 className="fw-bold mb-2">
          What is an opening balance?
        </h6>

        <p className="mb-0">
          Opening balances are the cash, GPay, stock and outstanding
          amounts that already existed before you started recording
          business transactions in this system.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-2">
                Opening Cash
              </div>

              <h3 className="mb-1">
                {cashOpening
                  ? formatAmount(cashOpening.amount)
                  : "₹0"}
              </h3>

              <small className="text-muted">
                Cash available at system start
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-2">
                Opening GPay
              </div>

              <h3 className="mb-1">
                {gpayOpening
                  ? formatAmount(gpayOpening.amount)
                  : "₹0"}
              </h3>

              <small className="text-muted">
                GPay available at system start
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-2">
                Shop Receivables
              </div>

              <h3 className="mb-1">
                {formatAmount(totalReceivable)}
              </h3>

              <small className="text-muted">
                Money already owed by shops
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-2">
                Distributor Payables
              </div>

              <h3 className="mb-1">
                {formatAmount(totalPayable)}
              </h3>

              <small className="text-muted">
                Money already owed to distributors
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary */}
      <div className="card shadow-sm mb-4">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-1">Opening Stock</h5>
            <p className="text-muted mb-0">
              Total quantity entered as stock already available.
            </p>
          </div>

          <div className="text-end">
            <h3 className="mb-0">
              {totalOpeningStock.toLocaleString("en-IN")} kg
            </h3>
            <small className="text-muted">
              Across {balances.filter(
                (balance) => balance.type === "stock"
              ).length} stock entries
            </small>
          </div>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Add Opening Balance */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-1">Set Opening Balance</h5>
          <small className="text-muted">
            Add a balance that existed before system records began.
          </small>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Type */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Balance Type
                </label>

                <select
                  className="form-select"
                  name="type"
                  value={form.type}
                  onChange={handleTypeChange}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="gpay">GPay</option>
                  <option value="stock">Stock</option>
                  <option value="shop_receivable">
                    Shop Receivable
                  </option>
                  <option value="distributor_payable">
                    Distributor Payable
                  </option>
                </select>
              </div>

              {/* Date */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Opening Date
                </label>

                <input
                  type="date"
                  className="form-control"
                  name="asOfDate"
                  value={form.asOfDate}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Amount */}
              {form.type !== "stock" && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Amount
                  </label>

                  <div className="input-group">
                    <span className="input-group-text">₹</span>

                    <input
                      type="number"
                      className="form-control"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Stock Product */}
              {form.type === "stock" && (
                <>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Product
                    </label>

                    <select
                      className="form-select"
                      name="product"
                      value={form.product}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select product
                      </option>

                      {products.map((product) => (
                        <option
                          key={product._id}
                          value={product._id}
                        >
                          {product.name}
                          {product.brand
                            ? ` - ${product.brand}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Quantity
                    </label>

                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        name="quantity"
                        value={form.quantity}
                        onChange={handleChange}
                        min="0.01"
                        step="0.01"
                        placeholder="Enter quantity"
                        required
                      />

                      <span className="input-group-text">
                        kg
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Shop */}
              {form.type === "shop_receivable" && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Shop
                  </label>

                  <select
                    className="form-select"
                    name="shop"
                    value={form.shop}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select shop
                    </option>

                    {shops.map((shop) => (
                      <option key={shop._id} value={shop._id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Distributor */}
              {form.type === "distributor_payable" && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Distributor
                  </label>

                  <select
                    className="form-select"
                    name="distributor"
                    value={form.distributor}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select distributor
                    </option>

                    {distributors.map((distributor) => (
                      <option
                        key={distributor._id}
                        value={distributor._id}
                      >
                        {distributor.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="col-12">
                <label className="form-label fw-semibold">
                  Notes
                </label>

                <textarea
                  className="form-control"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Example: Balance before system started"
                />
              </div>

              {/* Stock Warning */}
              {form.type === "stock" && (
                <div className="col-12">
                  <div className="alert alert-warning mb-0">
                    <strong>Stock note:</strong> Adding opening stock
                    will also add this quantity to the stock records.
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : "Add Opening Balance"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* History */}
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-1">Opening Balance History</h5>
          <small className="text-muted">
            Records that have been entered as starting balances.
          </small>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {balances.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-5 text-muted"
                    >
                      No opening balances have been added yet.
                    </td>
                  </tr>
                ) : (
                  balances.map((balance) => (
                    <tr key={balance._id}>
                      <td>
                        {formatDate(balance.asOfDate)}
                      </td>

                      <td>
                        <span
                          className={`badge ${getTypeBadge(
                            balance.type
                          )}`}
                        >
                          {getTypeLabel(balance.type)}
                        </span>
                      </td>

                      <td>
                        <span className="fw-semibold">
                          {getDetails(balance)}
                        </span>
                      </td>

                      <td>
                        {balance.amount !== undefined
                          ? formatAmount(balance.amount)
                          : "-"}
                      </td>

                      <td>
                        {balance.quantity !== undefined
                          ? `${balance.quantity} ${
                              balance.product?.unit || "kg"
                            }`
                          : "-"}
                      </td>

                      <td>
                        <span className="text-muted">
                          {balance.notes || "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpeningBalances;