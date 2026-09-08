import { useEffect, useState } from "react";
import axios from "axios";

function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [shopOrders, setShopOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryItems, setDeliveryItems] = useState([]);

  const [formData, setFormData] = useState({
    shopOrder: "",
    deliveredAt: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  // -----------------------------------------
  // Fetch deliveries
  // -----------------------------------------
  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/deliveries"
      );

      setDeliveries(response.data);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      setError("Failed to load deliveries.");
    }
  };

  // -----------------------------------------
  // Fetch shop orders
  // -----------------------------------------
  const fetchShopOrders = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/shop-orders"
      );

      setShopOrders(response.data);
    } catch (err) {
      console.error("Error fetching shop orders:", err);
      setError("Failed to load shop orders.");
    }
  };

  // -----------------------------------------
  // Initial load
  // -----------------------------------------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchDeliveries(),
        fetchShopOrders(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // -----------------------------------------
  // Calculate already delivered quantity
  // for a particular order + product
  // -----------------------------------------
  const getAlreadyDelivered = (orderId, productId) => {
    let delivered = 0;

    deliveries.forEach((delivery) => {
      if (
        delivery.shopOrder?._id !== orderId
      ) {
        return;
      }

      delivery.items?.forEach((item) => {
        if (
          item.product?._id === productId
        ) {
          delivered += item.quantityDelivered;
        }
      });
    });

    return delivered;
  };

  // -----------------------------------------
  // Handle Shop Order selection
  // -----------------------------------------
  const handleOrderChange = (e) => {
    const orderId = e.target.value;

    setError("");
    setSuccess("");

    if (!orderId) {
      setSelectedOrder(null);
      setDeliveryItems([]);

      setFormData((previous) => ({
        ...previous,
        shopOrder: "",
      }));

      return;
    }

    const order = shopOrders.find(
      (item) => item._id === orderId
    );

    if (!order) {
      return;
    }

    setSelectedOrder(order);

    setFormData((previous) => ({
      ...previous,
      shopOrder: orderId,
    }));

    // Build delivery items for every product
    // in the selected shop order
    const items = order.items.map((item) => {
      const alreadyDelivered =
        getAlreadyDelivered(
          order._id,
          item.product._id
        );

      const remaining =
        item.quantity - alreadyDelivered;

      return {
        product: item.product._id,
        productName: item.product.name,
        brand: item.product.brand,
        orderedQuantity: item.quantity,
        alreadyDelivered,
        remainingQuantity:
          Math.max(remaining, 0),
        quantityDelivered: "",
        pricePerKg: item.pricePerKg,
      };
    });

    setDeliveryItems(items);
  };

  // -----------------------------------------
  // Change delivery quantity or price
  // -----------------------------------------
  const handleItemChange = (
    index,
    field,
    value
  ) => {
    setDeliveryItems((previous) => {
      const updated = [...previous];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  };

  // -----------------------------------------
  // Reset form
  // -----------------------------------------
  const resetForm = () => {
    setFormData({
      shopOrder: "",
      deliveredAt:
        new Date()
          .toISOString()
          .slice(0, 16),
      notes: "",
    });

    setSelectedOrder(null);
    setDeliveryItems([]);

    setShowForm(false);
  };

  // -----------------------------------------
  // Create delivery
  // -----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedOrder) {
      setError("Please select a shop order.");
      return;
    }

    // Only include products where
    // the user entered a delivery quantity
    const itemsToDeliver =
      deliveryItems
        .filter(
          (item) =>
            Number(item.quantityDelivered) > 0
        )
        .map((item) => ({
          product: item.product,
          quantityDelivered: Number(
            item.quantityDelivered
          ),
          pricePerKg: Number(
            item.pricePerKg
          ),
        }));

    if (itemsToDeliver.length === 0) {
      setError(
        "Enter a delivery quantity for at least one product."
      );
      return;
    }

    // Frontend validation
    for (const item of deliveryItems) {
      const quantity =
        Number(item.quantityDelivered);

      if (quantity > item.remainingQuantity) {
        setError(
          `${item.productName} (${item.brand}): maximum remaining quantity is ${item.remainingQuantity} kg.`
        );
        return;
      }

      if (quantity < 0) {
        setError(
          `${item.productName} (${item.brand}): quantity cannot be negative.`
        );
        return;
      }
    }

    try {
      setFormLoading(true);

      const deliveryData = {
        shopOrder: selectedOrder._id,
        shop: selectedOrder.shop._id,
        items: itemsToDeliver,
        deliveredAt: formData.deliveredAt
          ? new Date(
              formData.deliveredAt
            ).toISOString()
          : undefined,
        notes: formData.notes,
      };

      const response = await axios.post(
        "http://localhost:5000/api/deliveries",
        deliveryData
      );

      setSuccess(
        `Delivery created successfully. Shop order is now ${response.data.shopOrderStatus}.`
      );

      resetForm();

      await Promise.all([
        fetchDeliveries(),
        fetchShopOrders(),
      ]);
    } catch (err) {
      console.error(
        "Error creating delivery:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to create delivery."
      );
    } finally {
      setFormLoading(false);
    }
  };

  // -----------------------------------------
  // Only orders that can still be delivered
  // -----------------------------------------
  const deliverableOrders =
    shopOrders.filter(
      (order) =>
        order.status === "pending" ||
        order.status === "partial"
    );

  if (loading) {
    return (
      <div className="container py-4">
        <h2>Deliveries</h2>
        <p className="text-muted">
          Loading deliveries...
        </p>
      </div>
    );
  }

  return (
    <div className="container py-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            Deliveries
          </h2>

          <p className="text-muted mb-0">
            Record products delivered to shops.
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
            + New Delivery
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* -------------------------------- */}
      {/* New Delivery Form */}
      {/* -------------------------------- */}

      {showForm && (
        <div className="card shadow-sm mb-4">

          <div className="card-body">

            <h5 className="mb-4">
              Create New Delivery
            </h5>

            <form onSubmit={handleSubmit}>

              {/* Shop Order */}
              <div className="mb-4">

                <label className="form-label">
                  Shop Order{" "}
                  <span className="text-danger">
                    *
                  </span>
                </label>

                <select
                  className="form-select"
                  value={formData.shopOrder}
                  onChange={
                    handleOrderChange
                  }
                >
                  <option value="">
                    Select Shop Order
                  </option>

                  {deliverableOrders.map(
                    (order) => (
                      <option
                        key={order._id}
                        value={order._id}
                      >
                        {order.shop?.name} —{" "}
                        {order._id.slice(-6)} —{" "}
                        {order.status}
                      </option>
                    )
                  )}
                </select>

                {deliverableOrders.length ===
                  0 && (
                  <small className="text-muted">
                    No pending or partial shop
                    orders available.
                  </small>
                )}

              </div>

              {/* Selected Shop */}
              {selectedOrder && (
                <>
                  <div className="alert alert-light border mb-4">

                    <strong>
                      Shop:
                    </strong>{" "}
                    {selectedOrder.shop?.name}

                    {selectedOrder.shop
                      ?.ownerName && (
                      <>
                        {" "}
                        —{" "}
                        {
                          selectedOrder.shop
                            .ownerName
                        }
                      </>
                    )}

                  </div>

                  {/* Products */}
                  <h6 className="mb-3">
                    Products in this order
                  </h6>

                  <div className="table-responsive mb-4">

                    <table className="table table-bordered align-middle">

                      <thead className="table-light">
                        <tr>
                          <th>Product</th>
                          <th>Ordered</th>
                          <th>Delivered</th>
                          <th>Remaining</th>
                          <th>Deliver Now</th>
                          <th>Price / kg</th>
                        </tr>
                      </thead>

                      <tbody>

                        {deliveryItems.map(
                          (item, index) => (
                            <tr key={item.product}>

                              {/* Product */}
                              <td>
                                <strong>
                                  {
                                    item.productName
                                  }
                                </strong>

                                <br />

                                <small className="text-muted">
                                  {
                                    item.brand
                                  }
                                </small>
                              </td>

                              {/* Ordered */}
                              <td>
                                {
                                  item.orderedQuantity
                                }{" "}
                                kg
                              </td>

                              {/* Already Delivered */}
                              <td>
                                {
                                  item.alreadyDelivered
                                }{" "}
                                kg
                              </td>

                              {/* Remaining */}
                              <td>
                                <strong>
                                  {
                                    item.remainingQuantity
                                  }{" "}
                                  kg
                                </strong>
                              </td>

                              {/* Deliver Now */}
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="0"
                                  max={
                                    item.remainingQuantity
                                  }
                                  step="0.01"
                                  value={
                                    item.quantityDelivered
                                  }
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "quantityDelivered",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0"
                                  disabled={
                                    item.remainingQuantity ===
                                    0
                                  }
                                />
                              </td>

                              {/* Price */}
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.pricePerKg
                                  }
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "pricePerKg",
                                      e.target.value
                                    )
                                  }
                                />
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                  {/* Delivery Date */}
                  <div className="mb-3">

                    <label className="form-label">
                      Delivery Date & Time
                    </label>

                    <input
                      type="datetime-local"
                      className="form-control"
                      value={
                        formData.deliveredAt
                      }
                      onChange={(e) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            deliveredAt:
                              e.target.value,
                          })
                        )
                      }
                    />

                  </div>

                  {/* Notes */}
                  <div className="mb-4">

                    <label className="form-label">
                      Notes
                    </label>

                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Optional delivery notes"
                      value={
                        formData.notes
                      }
                      onChange={(e) =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            notes: e.target.value,
                          })
                        )
                      }
                    />

                  </div>

                  {/* Buttons */}
                  <div className="d-flex gap-2">

                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={formLoading}
                    >
                      {formLoading
                        ? "Creating..."
                        : "Create Delivery"}
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
                </>
              )}

            </form>

          </div>
        </div>
      )}

      {/* -------------------------------- */}
      {/* Delivery History */}
      {/* -------------------------------- */}

      {deliveries.length === 0 ? (
        <div className="alert alert-info">
          No deliveries found.
        </div>
      ) : (
        <div className="card shadow-sm">

          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-hover mb-0">

                <thead className="table-light">
                  <tr>
                    <th>Shop</th>
                    <th>Order</th>
                    <th>Products</th>
                    <th>Delivered</th>
                    <th>Price / kg</th>
                    <th>Delivered At</th>
                    <th>Notes</th>
                  </tr>
                </thead>

                <tbody>

                  {deliveries.map(
                    (delivery) => (
                      <tr
                        key={delivery._id}
                      >

                        {/* Shop */}
                        <td>
                          <strong>
                            {delivery.shop
                              ?.name ||
                              "Unknown Shop"}
                          </strong>

                          <br />

                          <small className="text-muted">
                            {delivery.shop
                              ?.ownerName ||
                              ""}
                          </small>
                        </td>

                        {/* Order */}
                        <td>
                          <small>
                            {delivery.shopOrder
                              ? delivery.shopOrder._id.slice(
                                  -6
                                )
                              : "N/A"}
                          </small>
                        </td>

                        {/* Products */}
                        <td>
                          {delivery.items?.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={index}
                              >
                                <strong>
                                  {
                                    item
                                      .product
                                      ?.name
                                  }
                                </strong>{" "}
                                <span className="text-muted">
                                  (
                                  {
                                    item
                                      .product
                                      ?.brand
                                  }
                                  )
                                </span>
                              </div>
                            )
                          )}
                        </td>

                        {/* Quantity */}
                        <td>
                          {delivery.items?.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={index}
                              >
                                {
                                  item.quantityDelivered
                                }{" "}
                                kg
                              </div>
                            )
                          )}
                        </td>

                        {/* Price */}
                        <td>
                          {delivery.items?.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={index}
                              >
                                ₹
                                {item.pricePerKg.toLocaleString(
                                  "en-IN"
                                )}
                              </div>
                            )
                          )}
                        </td>

                        {/* Date */}
                        <td>
                          {new Date(
                            delivery.deliveredAt
                          ).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>

                        {/* Notes */}
                        <td>
                          {delivery.notes || (
                            <span className="text-muted">
                              —
                            </span>
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Deliveries;