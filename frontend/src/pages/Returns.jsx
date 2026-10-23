import { useEffect, useState } from "react";
import axios from "axios";
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

function Returns() {
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [returns, setReturns] = useState([]);
  const [shops, setShops] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [returnType, setReturnType] = useState("from_shop");

  const [formData, setFormData] = useState({
    party: "",
    product: "",
    quantity: "",
    pricePerKg: "",
    returnDate: todayIndia(),
    reason: "",
    notes: "",
  });

  const fetchReturns = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/returns`
      );

      setReturns(response.data);
    } catch (err) {
      console.error("Error fetching returns:", err);
      setError("Failed to load returns.");
    }
  };

  const fetchShops = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/shops`
      );

      setShops(response.data);
    } catch (err) {
      console.error("Error fetching shops:", err);
      setError("Failed to load shops.");
    }
  };

  const fetchDistributors = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/distributors`
      );

      setDistributors(response.data);
    } catch (err) {
      console.error("Error fetching distributors:", err);
      setError("Failed to load distributors.");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/products`
      );

      setProducts(response.data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
    }
  };

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/deliveries`
      );

      setDeliveries(response.data);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
    }
  };

  const fetchPurchaseReceipts = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/purchase-receipts`
      );

      setPurchaseReceipts(response.data);
    } catch (err) {
      console.error("Error fetching purchase receipts:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchReturns(),
        fetchShops(),
        fetchDistributors(),
        fetchProducts(),
        fetchDeliveries(),
        fetchPurchaseReceipts(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  const findShopPrice = (shopId, productId) => {
    if (!shopId || !productId) {
      return null;
    }

    const matchingDeliveries = deliveries.filter((delivery) => {
      if (delivery.shop?._id !== shopId) {
        return false;
      }

      return delivery.items?.some(
        (item) => item.product?._id === productId
      );
    });

    if (matchingDeliveries.length === 0) {
      return null;
    }

    matchingDeliveries.sort(
      (a, b) =>
        new Date(b.deliveredAt) -
        new Date(a.deliveredAt)
    );

    const latestDelivery = matchingDeliveries[0];

    return (
      latestDelivery.items?.find(
        (item) => item.product?._id === productId
      ) || null
    );
  };

  const findDistributorPrice = (
    distributorId,
    productId
  ) => {
    if (!distributorId || !productId) {
      return null;
    }

    const matchingReceipts = purchaseReceipts.filter(
      (receipt) => {
        if (receipt.distributor?._id !== distributorId) {
          return false;
        }

        return receipt.items?.some(
          (item) => item.product?._id === productId
        );
      }
    );

    if (matchingReceipts.length === 0) {
      return null;
    }

    matchingReceipts.sort(
      (a, b) =>
        new Date(b.receivedAt) -
        new Date(a.receivedAt)
    );

    const latestReceipt = matchingReceipts[0];

    return (
      latestReceipt.items?.find(
        (item) => item.product?._id === productId
      ) || null
    );
  };

  const getLatestPrice = (partyId, productId) => {
    if (!partyId || !productId) {
      return "";
    }

    let latestItem = null;

    if (returnType === "from_shop") {
      latestItem = findShopPrice(
        partyId,
        productId
      );
    } else {
      latestItem = findDistributorPrice(
        partyId,
        productId
      );
    }

    return latestItem?.pricePerKg ?? "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => {
      const updatedData = {
        ...previous,
        [name]: value,
      };

      if (name === "party") {
        updatedData.pricePerKg = getLatestPrice(
          value,
          previous.product
        );
      }

      if (name === "product") {
        updatedData.pricePerKg = getLatestPrice(
          previous.party,
          value
        );
      }

      return updatedData;
    });
  };

  const handleReturnTypeChange = (type) => {
    setReturnType(type);

    setFormData({
      party: "",
      product: "",
      quantity: "",
      pricePerKg: "",
      returnDate: new Date()
        .toISOString()
        .split("T")[0],
      reason: "",
      notes: "",
    });

    setError("");
    setSuccess("");
  };

  const resetForm = () => {
    setFormData({
      party: "",
      product: "",
      quantity: "",
      pricePerKg: "",
      returnDate: new Date()
        .toISOString()
        .split("T")[0],
      reason: "",
      notes: "",
    });

    setShowForm(false);
    setReturnType("from_shop");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.party ||
      !formData.product ||
      !formData.quantity ||
      formData.pricePerKg === ""
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!window.confirm("Save this entry?")) {
      return;
    }

    try {
      setFormLoading(true);

      const returnData = {
        returnType,
        items: [
          {
            product: formData.product,
            quantity: Number(formData.quantity),
            pricePerKg: Number(formData.pricePerKg),
          },
        ],
        returnDate: formData.returnDate,
        reason: formData.reason,
        notes: formData.notes,
      };

      if (returnType === "from_shop") {
        returnData.shop = formData.party;
      } else {
        returnData.distributor = formData.party;
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}/returns`,
        returnData
      );

      setSuccess(
        returnType === "from_shop"
          ? "Sales return created successfully!"
          : "Purchase return created successfully!"
      );

      resetForm();

      await fetchReturns();
    } catch (err) {
      console.error("Error creating return:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to create return."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const getPartyName = (returnItem) => {
    if (returnItem.returnType === "from_shop") {
      return returnItem.shop?.name || "Unknown Shop";
    }

    return (
      returnItem.distributor?.name ||
      "Unknown Distributor"
    );
  };

  const calculateTotal = (items) => {
    return items.reduce(
      (total, item) =>
        total + item.quantity * item.pricePerKg,
      0
    );
  };

  if (loading) {
    return (
      <div className="container py-4">
        <h2>Returns</h2>
        <p className="text-muted">
          Loading returns...
        </p>
      </div>
    );
  }

  const partyList =
    returnType === "from_shop"
      ? shops
      : distributors;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Returns</h2>
          <p className="text-muted mb-0">
            Manage sales and purchase returns.
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
            + New Return
          </button>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <SearchBox value={search} onChange={setSearch} />
        <EditToggle editMode={editMode} setEditMode={setEditMode} />
      </div>

{editing && (
        <EditModal
          title="Edit Return"
          path="/returns"
          record={editing}
          fields={[
            editing.returnType === "from_shop"
              ? {
                  name: "shop",
                  label: "Shop",
                  type: "select",
                  required: true,
                  options: shops.map((x) => ({ value: x._id, label: x.name })),
                }
              : {
                  name: "distributor",
                  label: "Distributor",
                  type: "select",
                  required: true,
                  options: distributors.map((x) => ({ value: x._id, label: x.name })),
                },
            { name: "returnDate", label: "Return date", type: "date", required: true },
            { name: "reason", label: "Reason" },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initialValues={{
            shop: editing.shop?._id || "",
            distributor: editing.distributor?._id || "",
            returnDate: indiaDate(editing.returnDate),
            reason: editing.reason || "",
            notes: editing.notes || "",
          }}
          itemsConfig={{ products, qtyKey: "quantity", qtyLabel: "Quantity (kg)" }}
          initialItems={editing.items.map((i) => ({
            product: i.product?._id || "",
            quantity: i.quantity,
            pricePerKg: i.pricePerKg,
          }))}
          onSaved={() => Promise.all([fetchReturns(), fetchDeliveries(), fetchPurchaseReceipts()])}
          onClose={() => setEditing(null)}
        />
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {showForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-4">
              Create New Return
            </h5>

            <div className="mb-4">
              <label className="form-label">
                Return Type
              </label>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`btn ${
                    returnType === "from_shop"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() =>
                    handleReturnTypeChange(
                      "from_shop"
                    )
                  }
                >
                  From Shop
                </button>

                <button
                  type="button"
                  className={`btn ${
                    returnType === "to_distributor"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() =>
                    handleReturnTypeChange(
                      "to_distributor"
                    )
                  }
                >
                  To Distributor
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    {returnType === "from_shop"
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
                  >
                    <option value="">
                      Select{" "}
                      {returnType === "from_shop"
                        ? "Shop"
                        : "Distributor"}
                    </option>

                    {partyList.map((party) => (
                      <option
                        key={party._id}
                        value={party._id}
                      >
                        {party.name}
                      </option>
                    ))}
                  </SearchSelect>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Product{" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <SearchSelect
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">
                      Select Product
                    </option>

                    {products.map((product) => (
                      <option
                        key={product._id}
                        value={product._id}
                      >
                        {product.name} -{" "}
                        {product.brand}
                      </option>
                    ))}
                  </SearchSelect>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Quantity ({unitOf(products.find((p) => p._id === formData.product))}){" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="form-control"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Price per {unitOf(products.find((p) => p._id === formData.product))} (₹){" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    name="pricePerKg"
                    value={formData.pricePerKg}
                    onChange={handleChange}
                    className="form-control"
                    min="0"
                    step="0.01"
                    placeholder="Latest price will appear automatically"
                  />

                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Return Date
                  </label>

                  <input
                    type="date"
                    name="returnDate"
                    value={formData.returnDate}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Reason
                  </label>

                  <input
                    type="text"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g. Damaged product"
                  />
                </div>

                <div className="col-12 mb-4">
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

              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Creating..."
                    : "Create Return"}
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

      {returns.length === 0 ? (
        <div className="alert alert-info">
          No returns found.
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Party</th>
                    <th>Products</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Reason</th>
                  <ActionsHeader editMode={editMode} />
</tr>
                </thead>

                <tbody>
                  {newestFirst(returns, "returnDate").filter(matchesSearch(search)).map((returnItem) => {
                    const totalAmount =
                      calculateTotal(
                        returnItem.items
                      );

                    return (
                      <tr key={returnItem._id}>
                        <td>
                          <span
                            className={`badge ${
                              returnItem.returnType ===
                              "from_shop"
                                ? "bg-success"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {returnItem.returnType ===
                            "from_shop"
                              ? "From Shop"
                              : "To Distributor"}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {getPartyName(
                              returnItem
                            )}
                          </strong>
                        </td>

                        <td>
                          {returnItem.items.map(
                            (item, index) => (
                              <div key={index}>
                                {item.product?.name}{" "}
                                <span className="text-muted">
                                  (
                                  {
                                    item.product
                                      ?.brand
                                  }
                                  )
                                </span>
                              </div>
                            )
                          )}
                        </td>

                        <td>
                          {qtyByUnit(returnItem.items, "quantity")}
                        </td>

                        <td>
                          ₹
                          {totalAmount.toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td>
                          {new Date(
                            returnItem.returnDate
                          ).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>

                        <td>
                          {returnItem.reason ||
                            "-"}
                        </td>
                      <ActionsCell
  editMode={editMode}
  onEdit={() => setEditing(returnItem)}
  onDelete={() =>
    deleteEntry({ path: "/returns", id: returnItem._id, label: "return", onDone: () => Promise.all([fetchReturns(), fetchDeliveries(), fetchPurchaseReceipts()]) })
  }
/>
</tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Returns;