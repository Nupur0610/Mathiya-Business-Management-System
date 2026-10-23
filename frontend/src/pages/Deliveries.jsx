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
  newestFirst,
  unitOf,
  SearchSelect,
} from "../components/EditTools";

// Current date and time for <input type="datetime-local"> (device time)
const nowLocalInput = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

function Deliveries() {
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [deliveries, setDeliveries] = useState([]);
  const [shopOrders, setShopOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedShopId, setSelectedShopId] = useState("");
  const [deliveryItems, setDeliveryItems] = useState([]);

  const [formData, setFormData] = useState({
    deliveredAt: nowLocalInput(),
    notes: "",
  });

  // -----------------------------------------
  // Fetch deliveries
  // -----------------------------------------
  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/deliveries`
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
        `${import.meta.env.VITE_API_URL}/shop-orders`
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
  const handleShopChange = (e) => {
    const shopId = e.target.value;

    setError("");
    setSuccess("");
    setSelectedShopId(shopId);

    if (!shopId) {
      setDeliveryItems([]);
      return;
    }

    // Every pending product of every pending order of this shop,
    // oldest order first
    const rows = [];

    [...shopOrders]
      .filter(
        (order) =>
          order.shop?._id === shopId &&
          (order.status === "pending" || order.status === "partial")
      )
      .sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate))
      .forEach((order) => {
        order.items.forEach((item) => {
          const alreadyDelivered = getAlreadyDelivered(
            order._id,
            item.product._id
          );

          const remaining = Math.max(item.quantity - alreadyDelivered, 0);

          if (remaining <= 0) {
            return;
          }

          rows.push({
            orderId: order._id,
            orderDate: order.orderDate,
            product: item.product._id,
            productName: item.product.name,
            brand: item.product.brand,
            unit: unitOf(item.product),
            orderedQuantity: item.quantity,
            alreadyDelivered,
            remainingQuantity: remaining,
            quantityDelivered: "",
            pricePerKg: item.pricePerKg,
          });
        });
      });

    setDeliveryItems(rows);
  };

  // Put the full remaining quantity in every row
  const fillAllRemaining = () => {
    setDeliveryItems((previous) =>
      previous.map((item) => ({
        ...item,
        quantityDelivered: item.remainingQuantity,
      }))
    );
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
      deliveredAt: nowLocalInput(),
      notes: "",
    });

    setSelectedShopId("");
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

    if (!selectedShopId) {
      setError("Please select a shop.");
      return;
    }

    // Validate every row first
    for (const item of deliveryItems) {
      const quantity = Number(item.quantityDelivered || 0);

      if (quantity > item.remainingQuantity) {
        setError(
          `${item.productName} (${item.brand}): maximum remaining quantity is ${item.remainingQuantity} ${item.unit || "kg"}.`
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

    const filledRows = deliveryItems.filter(
      (item) => Number(item.quantityDelivered) > 0
    );

    if (filledRows.length === 0) {
      setError("Enter a delivery quantity for at least one product.");
      return;
    }

    // One delivery per order (the app keeps each delivery tied to its order)
    const byOrder = {};

    filledRows.forEach((item) => {
      if (!byOrder[item.orderId]) {
        byOrder[item.orderId] = [];
      }

      byOrder[item.orderId].push({
        product: item.product,
        quantityDelivered: Number(item.quantityDelivered),
        pricePerKg: Number(item.pricePerKg),
      });
    });

    const shopName = shopOptions.find((x) => x._id === selectedShopId)?.name;

    const summary = filledRows
      .map(
        (item) =>
          `${item.productName} - ${item.quantityDelivered} ${item.unit || "kg"}`
      )
      .join("\n");

    if (
      !window.confirm(`Save this delivery for ${shopName}?\n\n${summary}`)
    ) {
      return;
    }

    let savedCount = 0;

    try {
      setFormLoading(true);

      for (const [orderId, items] of Object.entries(byOrder)) {
        await axios.post(`${import.meta.env.VITE_API_URL}/deliveries`, {
          shopOrder: orderId,
          shop: selectedShopId,
          items,
          deliveredAt: formData.deliveredAt
            ? new Date(formData.deliveredAt).toISOString()
            : undefined,
          notes: formData.notes,
        });

        savedCount += 1;
      }

      setSuccess(
        `Delivery saved for ${shopName}: ${filledRows.length} product${
          filledRows.length > 1 ? "s" : ""
        } delivered.`
      );

      resetForm();
    } catch (err) {
      console.error("Error creating delivery:", err);

      setError(
        (savedCount > 0
          ? `Only part was saved (${savedCount} of ${
              Object.keys(byOrder).length
            } orders). Check Delivery History before trying again. `
          : "") +
          (err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to create delivery.")
      );
    } finally {
      setFormLoading(false);

      await Promise.all([fetchDeliveries(), fetchShopOrders()]);
    }
  };

  // -----------------------------------------
  // Only orders that can still be delivered
  // -----------------------------------------
  const deliverableOrders = newestFirst(
    shopOrders,
    "orderDate"
  ).filter(
      (order) =>
        order.status === "pending" ||
        order.status === "partial"
    );

  // Shops that still have something pending
  const shopOptions = [];

  deliverableOrders.forEach((order) => {
    if (order.shop && !shopOptions.find((x) => x._id === order.shop._id)) {
      shopOptions.push(order.shop);
    }
  });

  shopOptions.sort((a, b) => a.name.localeCompare(b.name));

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
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <SearchBox value={search} onChange={setSearch} />
        <EditToggle editMode={editMode} setEditMode={setEditMode} />
      </div>

{editing && (
        <EditModal
          title={`Edit Delivery - ${editing.shop?.name || ""}`}
          path="/deliveries"
          record={editing}
          fields={[
            { name: "deliveredAt", label: "Delivery date", type: "date", required: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initialValues={{
            deliveredAt: indiaDate(editing.deliveredAt),
            notes: editing.notes || "",
          }}
          itemsConfig={{
            products: (() => {
              const order = shopOrders.find(
                (o) => o._id === editing.shopOrder?._id
              );
              const list = [
                ...(order?.items || []).map((i) => i.product),
                ...(editing.items || []).map((i) => i.product),
              ].filter(Boolean);
              return list.filter(
                (item, index) =>
                  list.findIndex((x) => x._id === item._id) === index
              );
            })(),
            qtyKey: "quantityDelivered",
            qtyLabel: "Delivered",
          }}
          initialItems={editing.items.map((i) => ({
            product: i.product?._id || "",
            quantityDelivered: i.quantityDelivered,
            pricePerKg: i.pricePerKg,
          }))}
          onSaved={() => Promise.all([fetchDeliveries(), fetchShopOrders()])}
          onClose={() => setEditing(null)}
        />
      )}

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

              {/* Shop */}
              <div className="mb-3">
                <label className="form-label">
                  Shop <span className="text-danger">*</span>
                </label>

                <SearchSelect
                  value={selectedShopId}
                  onChange={handleShopChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Shop</option>

                  {shopOptions.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.name} - {shop.ownerName}
                    </option>
                  ))}
                </SearchSelect>

                {shopOptions.length === 0 && (
                  <small className="text-muted">
                    No shop has a pending order right now.
                  </small>
                )}
              </div>

              {selectedShopId && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <h6 className="mb-0">
                      Pending products of this shop
                    </h6>

                    {deliveryItems.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={fillAllRemaining}
                      >
                        Fill all remaining
                      </button>
                    )}
                  </div>

                  {deliveryItems.length === 0 ? (
                    <div className="alert alert-info">
                      Nothing is pending for this shop.
                    </div>
                  ) : (
                    <div className="table-responsive mb-3">
                      <table className="table table-bordered align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Order date</th>
                            <th>Product</th>
                            <th>Ordered</th>
                            <th>Delivered</th>
                            <th>Remaining</th>
                            <th>Deliver Now</th>
                            <th>Price / unit</th>
                          </tr>
                        </thead>

                        <tbody>
                          {deliveryItems.map((item, index) => (
                            <tr key={`${item.orderId}-${item.product}`}>
                              <td>
                                {new Date(item.orderDate).toLocaleDateString(
                                  "en-IN"
                                )}
                              </td>

                              <td>
                                <strong>{item.productName}</strong>
                                <br />
                                <small className="text-muted">
                                  {item.brand}
                                </small>
                              </td>

                              <td>
                                {item.orderedQuantity} {item.unit}
                              </td>

                              <td>
                                {item.alreadyDelivered} {item.unit}
                              </td>

                              <td>
                                <strong>
                                  {item.remainingQuantity} {item.unit}
                                </strong>
                              </td>

                              <td style={{ minWidth: "110px" }}>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="0"
                                  max={item.remainingQuantity}
                                  step="0.01"
                                  value={item.quantityDelivered}
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "quantityDelivered",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0"
                                />
                              </td>

                              <td style={{ minWidth: "100px" }}>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="0"
                                  step="0.01"
                                  value={item.pricePerKg}
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

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
                    <th>Price / unit</th>
                    <th>Delivered At</th>
                    <th>Notes</th>
                  <ActionsHeader editMode={editMode} />
</tr>
                </thead>

                <tbody>

                  {newestFirst(deliveries, "deliveredAt").filter(matchesSearch(search)).map(
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
                                {unitOf(item.product)}
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

                      <ActionsCell
  editMode={editMode}
  onEdit={() => setEditing(delivery)}
  onDelete={() =>
    deleteEntry({ path: "/deliveries", id: delivery._id, label: "delivery", onDone: () => Promise.all([fetchDeliveries(), fetchShopOrders()]) })
  }
/>
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