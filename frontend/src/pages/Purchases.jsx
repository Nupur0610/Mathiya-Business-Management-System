import { useEffect, useState } from "react";
import axios from "axios";

function Purchases() {
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
        axios.get("http://localhost:5000/api/purchase-orders"),
        axios.get("http://localhost:5000/api/purchase-receipts"),
        axios.get("http://localhost:5000/api/distributors"),
        axios.get("http://localhost:5000/api/products"),
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
  // CREATE PURCHASE ORDER
  // ==============================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        "http://localhost:5000/api/purchase-orders",
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
      console.error("Create purchase order error:", err);

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
        "http://localhost:5000/api/purchase-receipts",
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

                  <select
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

                  </select>

                </div>

                {/* PRODUCT */}

                <div className="col-md-6 mb-3">

                  <label className="form-label">
                    Product
                  </label>

                  <select
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

                  </select>

                </div>

                {/* QUANTITY */}

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Quantity (kg)
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
                    Price per kg (₹)
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
                      value={`${selectedOrder.items?.[0]?.quantity || 0} kg`}
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
                      )} kg`}
                      disabled
                    />

                  </div>

                  {/* NEW RECEIPT */}

                  <div className="col-md-4 mb-3">

                    <label className="form-label">
                      Quantity Received (kg)
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
                      Price per kg (₹)
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
                    <th>Price / kg</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {orders.length === 0 ? (

                    <tr>

                      <td
                        colSpan="9"
                        className="text-center py-4 text-muted"
                      >
                        No purchase orders found.
                      </td>

                    </tr>

                  ) : (

                    orders.map(
                      (order) => {

                        const item =
                          order.items?.[0];

                        const ordered =
                          Number(
                            item?.quantity || 0
                          );

                        const received =
                          getReceivedQuantity(
                            order._id,
                            item?.product?._id
                          );

                        const remaining =
                          Math.max(
                            ordered -
                              received,
                            0
                          );

                        const total =
                          ordered *
                          Number(
                            item?.pricePerKg ||
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
                              {ordered} kg
                            </td>

                            <td>
                              <strong>
                                {received} kg
                              </strong>
                            </td>

                            <td>
                              {remaining} kg
                            </td>

                            <td>
                              ₹
                              {
                                item?.pricePerKg ||
                                  0
                              }
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
                  <th>Price / kg</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>

              </thead>

              <tbody>

                {receipts.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="text-center py-4 text-muted"
                    >
                      No purchase receipts found.
                    </td>

                  </tr>

                ) : (

                  receipts.map(
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
                              kg
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