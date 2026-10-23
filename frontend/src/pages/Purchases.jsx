
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
  newestFirst,
  unitOf,
} from "../components/EditTools";

function Purchases() {
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [formData, setFormData] = useState({
    distributor: "",
    product: "",
    quantity: "",
    pricePerKg: "",
    notes: "",
  });

  const [receiptData, setReceiptData] = useState({
    quantityReceived: "",
    pricePerKg: "",
    notes: "",
  });

  // ==============================
  // FETCH DATA
  // ==============================

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        ordersResponse,
        receiptsResponse,
        distributorsResponse,
        productsResponse,
      ] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/purchase-orders`),
        axios.get(`${import.meta.env.VITE_API_URL}/purchase-receipts`),
        axios.get(`${import.meta.env.VITE_API_URL}/distributors`),
        axios.get(`${import.meta.env.VITE_API_URL}/products`),
      ]);

      setOrders(ordersResponse.data);
      setReceipts(receiptsResponse.data);
      setDistributors(distributorsResponse.data);
      setProducts(productsResponse.data);
    } catch (err) {
      console.error("Error loading purchase data:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ==============================
  // FETCH PURCHASE PRICE
  // ==============================

  const fetchPurchasePrice = async (
    distributorId,
    productId
  ) => {
    if (!distributorId || !productId) {
      setFormData((prev) => ({
        ...prev,
        pricePerKg: "",
      }));

      return;
    }

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/purchase-prices/${distributorId}/${productId}`
      );

      setFormData((prev) => ({
        ...prev,
        pricePerKg: response.data.pricePerKg,
      }));
    } catch (err) {
      if (err.response?.status === 404) {
        setFormData((prev) => ({
          ...prev,
          pricePerKg: "",
        }));
      } else {
        console.error(
          "Error fetching purchase price:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to fetch purchase price."
        );
      }
    }
  };

  // ==============================
  // CREATE PURCHASE ORDER
  // ==============================

  const handleChange = async (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "distributor") {
      setFormData((prev) => ({
        ...prev,
        distributor: value,
        pricePerKg: "",
      }));

      await fetchPurchasePrice(
        value,
        formData.product
      );
    }

    if (name === "product") {
      setFormData((prev) => ({
        ...prev,
        product: value,
        pricePerKg: "",
      }));

      await fetchPurchasePrice(
        formData.distributor,
        value
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!window.confirm("Save this entry?")) {
      return;
    }

    try {
      setError("");

      const payload = {
        distributor: formData.distributor,
        items: [
          {
            product: formData.product,
            quantity: Number(formData.quantity),
            pricePerKg: Number(formData.pricePerKg),
          },
        ],
        notes: formData.notes,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/purchase-orders`,
        payload
      );

      setFormData({
        distributor: "",
        product: "",
        quantity: "",
        pricePerKg: "",
        notes: "",
      });

      setShowForm(false);

      await fetchData();
    } catch (err) {
      console.error(
        "Create purchase order error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to create purchase order."
      );
    }
  };

  // ==============================
  // RECEIVE STOCK
  // ==============================

  const openReceiptForm = (order) => {
    const item = order.items?.[0];

    setSelectedOrder(order);

    setReceiptData({
      quantityReceived: "",
      pricePerKg: item?.pricePerKg || "",
      notes: "",
    });

    setShowReceiptForm(true);
    setError("");
  };

  const handleReceiptChange = (e) => {
    setReceiptData({
      ...receiptData,
      [e.target.name]: e.target.value,
    });
  };

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();

    if (!selectedOrder) {
      return;
    }

    if (!window.confirm("Save this entry?")) {
      return;
    }

    try {
      setError("");

      const orderItem = selectedOrder.items?.[0];

      const payload = {
        purchaseOrder: selectedOrder._id,
        distributor: selectedOrder.distributor._id,

        items: [
          {
            product: orderItem.product._id,
            quantityReceived: Number(
              receiptData.quantityReceived
            ),
            pricePerKg: Number(
              receiptData.pricePerKg
            ),
          },
        ],

        receivedAt: new Date().toISOString(),
        notes: receiptData.notes,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/purchase-receipts`,
        payload
      );

      setReceiptData({
        quantityReceived: "",
        pricePerKg: "",
        notes: "",
      });

      setSelectedOrder(null);
      setShowReceiptForm(false);

      await fetchData();
    } catch (err) {
      console.error("Receive stock error:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to receive stock."
      );
    }
  };

  // ==============================
  // CALCULATE RECEIVED QUANTITY
  // ==============================

  const getReceivedQuantity = (
    orderId,
    productId
  ) => {
    return receipts.reduce((total, receipt) => {
      if (
        receipt.purchaseOrder?._id !== orderId
      ) {
        return total;
      }

      const receiptQuantity =
        (receipt.items || []).reduce(
          (sum, item) => {
            if (
              item.product?._id === productId
            ) {
              return (
                sum +
                Number(
                  item.quantityReceived || 0
                )
              );
            }

            return sum;
          },
          0
        );

      return total + receiptQuantity;
    }, 0);
  };

  // ==============================
  // STATUS STYLE
  // ==============================

  const getStatusClass = (status) => {
    if (status === "completed") {
      return "bg-success";
    }

    if (status === "partial") {
      return "bg-info text-dark";
    }

    if (status === "pending") {
      return "bg-warning text-dark";
    }

    if (status === "cancelled") {
      return "bg-danger";
    }

    return "bg-secondary";
  };

  // ==============================
  // DATE FORMAT
  // ==============================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString(
      "en-IN"
    );
  };

  // ==============================
  // UI
  // ==============================

  return (
    <div className="container-fluid py-4">

      {/* HEADER */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h2 className="mb-1">
            Purchases
          </h2>

          <p className="text-muted mb-0">
            Manage purchase orders and incoming stock.
          </p>
        </div>

        <button
          className="btn btn-dark"
          onClick={() =>
            setShowForm(!showForm)
          }
        >
          {showForm
            ? "Cancel"
            : "+ New Purchase Order"}
        </button>

      </div>

      {/* ERROR */}

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <SearchBox value={search} onChange={setSearch} />
        <EditToggle editMode={editMode} setEditMode={setEditMode} />
      </div>

{editing && (
        <EditModal
          title="Edit Purchase Order"
          path="/purchase-orders"
          record={editing}
          fields={[
            {
              name: "distributor",
              label: "Distributor",
              type: "select",
              required: true,
              options: distributors.map((x) => ({ value: x._id, label: x.name })),
            },
            { name: "orderDate", label: "Order date", type: "date", required: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initialValues={{
            distributor: editing.distributor?._id || "",
            orderDate: indiaDate(editing.orderDate),
            notes: editing.notes || "",
          }}
          itemsConfig={{ products, qtyKey: "quantity", qtyLabel: "Quantity" }}
          initialItems={editing.items.map((i) => ({
            product: i.product?._id || "",
            quantity: i.quantity,
            pricePerKg: i.pricePerKg,
          }))}
          onSaved={fetchData}
          onClose={() => setEditing(null)}
        />
      )}

      {editingReceipt && (
        <EditModal
          title="Edit Purchase Receipt"
          path="/purchase-receipts"
          record={editingReceipt}
          fields={[
            { name: "receivedAt", label: "Received date", type: "date", required: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initialValues={{
            receivedAt: indiaDate(editingReceipt.receivedAt),
            notes: editingReceipt.notes || "",
          }}
          itemsConfig={{ products, qtyKey: "quantityReceived", qtyLabel: "Received" }}
          initialItems={editingReceipt.items.map((i) => ({
            product: i.product?._id || "",
            quantityReceived: i.quantityReceived,
            pricePerKg: i.pricePerKg,
          }))}
          onSaved={fetchData}
          onClose={() => setEditingReceipt(null)}
        />
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* ================================= */}
      {/* CREATE PURCHASE ORDER FORM */}
      {/* ================================= */}

      {showForm && (
        <div className="card shadow-sm mb-4">

          <div className="card-body">

            <h5 className="mb-3">
              Create Purchase Order
            </h5>

            <form onSubmit={handleSubmit}>

              <div className="row">

                {/* DISTRIBUTOR */}

                <div className="col-md-6 mb-3">

                  <label className="form-label">
                    Distributor
                  </label>

                  <SearchSelect
                    name="distributor"
                    className="form-select"
                    value={formData.distributor}
                    onChange={handleChange}
                    required
                  >

                    <option value="">
                      Select distributor
                    </option>

                    {distributors.map(
                      (distributor) => (
                        <option
                          key={distributor._id}
                          value={distributor._id}
                        >
                          {distributor.name}
                        </option>
                      )
                    )}

                  </SearchSelect>

                </div>

                {/* PRODUCT */}

                <div className="col-md-6 mb-3">

                  <label className="form-label">
                    Product
                  </label>

                  <SearchSelect
                    name="product"
                    className="form-select"
                    value={formData.product}
                    onChange={handleChange}
                    required
                  >

                    <option value="">
                      Select product
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={product._id}
                          value={product._id}
                        >
                          {product.name} -{" "}
                          {product.brand}
                        </option>
                      )
                    )}

                  </SearchSelect>

                </div>

                {/* QUANTITY */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Quantity ({unitOf(products.find((p) => p._id === formData.product))})
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    className="form-control"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />

                </div>

                {/* PRICE */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Price per {unitOf(products.find((p) => p._id === formData.product))} (₹)
                  </label>

                  <input
                    type="number"
                    name="pricePerKg"
                    className="form-control"
                    min="0"
                    value={formData.pricePerKg}
                    onChange={handleChange}
                    required
                  />

                  {formData.pricePerKg && (
                    <small className="text-muted">
                      Auto-filled price. You can edit it if needed.
                    </small>
                  )}

                </div>

                {/* NOTES */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Notes
                  </label>

                  <input
                    type="text"
                    name="notes"
                    className="form-control"
                    value={formData.notes}
                    onChange={handleChange}
                  />

                </div>

              </div>

              <button
                type="submit"
                className="btn btn-primary"
              >
                Create Purchase Order
              </button>

            </form>

          </div>

        </div>
      )}

      {/* ================================= */}
      {/* RECEIVE STOCK FORM */}
      {/* ================================= */}

      {showReceiptForm &&
        selectedOrder && (
          <div className="card border-primary shadow-sm mb-4">

            <div className="card-body">

              <div className="d-flex justify-content-between align-items-center mb-3">

                <div>

                  <h5 className="mb-1">
                    Receive Stock
                  </h5>

                  <p className="text-muted mb-0">

                    {selectedOrder.distributor?.name}

                    {" — "}

                    {
                      selectedOrder.items?.[0]
                        ?.product?.name
                    }

                    {" "}

                    (
                    {
                      selectedOrder.items?.[0]
                        ?.product?.brand
                    }
                    )

                  </p>

                </div>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowReceiptForm(
                      false
                    );
                    setSelectedOrder(null);
                  }}
                >
                  Cancel
                </button>

              </div>

              <form
                onSubmit={
                  handleReceiptSubmit
                }
              >

                <div className="row">

                  {/* ORDERED */}

                  <div className="col-md-4 mb-3">

                    <label className="form-label">
                      Ordered Quantity
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={`${selectedOrder.items?.[0]?.quantity || 0} ${unitOf(selectedOrder.items?.[0]?.product)}`}
                      disabled
                    />

                  </div>

                  {/* ALREADY RECEIVED */}

                  <div className="col-md-4 mb-3">

                    <label className="form-label">
                      Already Received
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={`${getReceivedQuantity(
                        selectedOrder._id,
                        selectedOrder.items?.[0]
                          ?.product?._id
                      )} ${unitOf(selectedOrder.items?.[0]?.product)}`}
                      disabled
                    />

                  </div>

                  {/* NEW RECEIPT */}

                  <div className="col-md-4 mb-3">

                    <label className="form-label">
                      Quantity Received ({unitOf(selectedOrder?.items?.[0]?.product)})
                    </label>

                    <input
                      type="number"
                      name="quantityReceived"
                      className="form-control"
                      min="1"
                      value={
                        receiptData.quantityReceived
                      }
                      onChange={
                        handleReceiptChange
                      }
                      required
                    />

                  </div>

                  {/* PRICE */}

                  <div className="col-md-6 mb-3">

                    <label className="form-label">
                      Price per {unitOf(selectedOrder?.items?.[0]?.product)} (₹)
                    </label>

                    <input
                      type="number"
                      name="pricePerKg"
                      className="form-control"
                      min="0"
                      value={
                        receiptData.pricePerKg
                      }
                      onChange={
                        handleReceiptChange
                      }
                      required
                    />

                  </div>

                  {/* NOTES */}

                  <div className="col-md-6 mb-3">

                    <label className="form-label">
                      Notes
                    </label>

                    <input
                      type="text"
                      name="notes"
                      className="form-control"
                      placeholder="Optional"
                      value={
                        receiptData.notes
                      }
                      onChange={
                        handleReceiptChange
                      }
                    />

                  </div>

                </div>

                <button
                  type="submit"
                  className="btn btn-success"
                >
                  Confirm Receipt
                </button>

              </form>

            </div>

          </div>
        )}

      {/* ================================= */}
      {/* PURCHASE ORDERS TABLE */}
      {/* ================================= */}

      <div className="mb-5">

        <div className="mb-3">

          <h4>
            Purchase Orders
          </h4>

          <p className="text-muted">
            Orders placed with distributors.
          </p>

        </div>

        {loading ? (

          <div className="text-center py-5">

            <div
              className="spinner-border"
              role="status"
            />

            <p className="text-muted mt-2">
              Loading purchases...
            </p>

          </div>

        ) : (

          <div className="card shadow-sm">

            <div className="table-responsive">

              <table className="table table-hover mb-0">

                <thead className="table-light">

                  <tr>
                    <th>Distributor</th>
                    <th>Product</th>
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Remaining</th>
                    <th>Price / unit</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  <ActionsHeader editMode={editMode} />
</tr>

                </thead>

                <tbody>

                  {newestFirst(orders, "orderDate").filter(matchesSearch(search)).length === 0 ? (

                    <tr>

                      <td
                        colSpan={editMode ? 10 : 9}
                        className="text-center py-4 text-muted"
                      >
                        No purchase orders found.
                      </td>

                    </tr>

                  ) : (

                    newestFirst(orders, "orderDate").filter(matchesSearch(search)).map(
                      (order) => {

                        // An order can hold several products: show every one of them
                        const lines = (order.items || []).map((line) => {
                          const lineOrdered = Number(line.quantity || 0);
                          const lineReceived = getReceivedQuantity(
                            order._id,
                            line.product?._id
                          );

                          return {
                            line,
                            lineOrdered,
                            lineReceived,
                            lineRemaining: Math.max(
                              lineOrdered - lineReceived,
                              0
                            ),
                            lineTotal:
                              lineOrdered *
                              Number(line.pricePerKg || 0),
                          };
                        });

                        const remaining = lines.reduce(
                          (sum, l) => sum + l.lineRemaining,
                          0
                        );

                        const total = lines.reduce(
                          (sum, l) => sum + l.lineTotal,
                          0
                        );

                        return (
                          <tr
                            key={
                              order._id
                            }
                          >

                            <td>
                              <strong>
                                {
                                  order
                                    .distributor
                                    ?.name
                                }
                              </strong>
                            </td>

                            <td>
  {lines.map((l, i) => (
    <div key={i} className={i > 0 ? "mt-1" : ""}>
      {l.line.product?.name}
      <small className="text-muted d-block">
        {l.line.product?.brand}
      </small>
    </div>
  ))}
</td>

                            <td>
  {lines.map((l, i) => (
    <div key={i} className={i > 0 ? "mt-3" : ""}>{l.lineOrdered} {unitOf(l.line.product)}</div>
  ))}
</td>

                            <td>
  {lines.map((l, i) => (
    <div key={i} className={i > 0 ? "mt-3" : ""}><strong>{l.lineReceived} {unitOf(l.line.product)}</strong></div>
  ))}
</td>

                            <td>
  {lines.map((l, i) => (
    <div key={i} className={i > 0 ? "mt-3" : ""}>{l.lineRemaining} {unitOf(l.line.product)}</div>
  ))}
</td>

                            <td>
  {lines.map((l, i) => (
    <div key={i} className={i > 0 ? "mt-3" : ""}>₹{l.line.pricePerKg || 0}</div>
  ))}
</td>

                            <td>
                              <strong>
                                ₹
                                {total.toLocaleString(
                                  "en-IN"
                                )}
                              </strong>
                            </td>

                            <td>

                              <span
                                className={`badge ${getStatusClass(
                                  order.status
                                )}`}
                              >
                                {
                                  order.status
                                }
                              </span>

                            </td>

                            <td>

                              {order.status !==
                                "completed" &&
                                order.status !==
                                  "cancelled" &&
                                remaining >
                                  0 && (
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() =>
                                      openReceiptForm(
                                        order
                                      )
                                    }
                                  >
                                    Receive Stock
                                  </button>
                                )}

                              {(order.status ===
                                "completed" ||
                                order.status ===
                                  "cancelled") && (
                                <span className="text-muted">
                                  —
                                </span>
                              )}

                            </td>

                          <ActionsCell
  editMode={editMode}
  onEdit={() => setEditing(order)}
  onDelete={() =>
    deleteEntry({ path: "/purchase-orders", id: order._id, label: "purchase order", onDone: fetchData })
  }
/>
</tr>
                        );
                      }
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

      {/* ================================= */}
      {/* PURCHASE RECEIPTS TABLE */}
      {/* ================================= */}

      <div>

        <div className="mb-3">

          <h4>
            Purchase Receipts
          </h4>

          <p className="text-muted">
            Stock actually received from distributors.
          </p>

        </div>

        <div className="card shadow-sm">

          <div className="table-responsive">

            <table className="table table-hover mb-0">

              <thead className="table-light">

                <tr>
                  <th>Distributor</th>
                  <th>Product</th>
                  <th>Received</th>
                  <th>Price / unit</th>
                  <th>Date</th>
                  <th>Notes</th>
                <ActionsHeader editMode={editMode} />
</tr>

              </thead>

              <tbody>

                {newestFirst(receipts, "receivedAt").filter(matchesSearch(search)).length === 0 ? (

                  <tr>

                    <td
                      colSpan={editMode ? 7 : 6}
                      className="text-center py-4 text-muted"
                    >
                      No purchase receipts found.
                    </td>

                  </tr>

                ) : (

                  newestFirst(receipts, "receivedAt").filter(matchesSearch(search)).map(
                    (receipt) => {

                      const item =
                        receipt.items?.[0];

                      return (
                        <tr
                          key={
                            receipt._id
                          }
                        >

                          <td>
                            {
                              receipt
                                .distributor
                                ?.name
                            }
                          </td>

                          <td>

                            {
                              item?.product
                                ?.name
                            }

                            <small className="text-muted d-block">
                              {
                                item?.product
                                  ?.brand
                              }
                            </small>

                          </td>

                          <td>
                            <strong>
                              {
                                item?.quantityReceived ||
                                  0
                              }{" "}
                              {unitOf(item?.product)}
                            </strong>
                          </td>

                          <td>
                            ₹
                            {
                              item?.pricePerKg ||
                                0
                            }
                          </td>

                          <td>
                            {formatDate(
                              receipt.receivedAt
                            )}
                          </td>

                          <td>
                            {
                              receipt.notes ||
                                "-"
                            }
                          </td>

                        <ActionsCell
  editMode={editMode}
  onEdit={() => setEditingReceipt(receipt)}
  onDelete={() =>
    deleteEntry({ path: "/purchase-receipts", id: receipt._id, label: "purchase receipt", onDone: fetchData })
  }
/>
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

    </div>
  );
}

export default Purchases;

