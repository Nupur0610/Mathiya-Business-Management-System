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
  todayIndia,
  newestFirst,
  qtyByUnit,
  unitOf,
  SearchSelect,
} from "../components/EditTools";

function ShopOrders() {
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [priceSource, setPriceSource] = useState("");

  const emptyItem = () => ({
    product: "",
    quantity: "",
    pricePerKg: "",
    priceNote: "",
  });

  const [formData, setFormData] = useState({
    shop: "",
    orderDate: todayIndia(),
    notes: "",
  });

  // One order can hold many products
  const [formItems, setFormItems] = useState([emptyItem()]);

  // Fetch shop orders
  const fetchOrders = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/shop-orders`
      );

      setOrders(response.data);
    } catch (err) {
      console.error("Error fetching shop orders:", err);
      setError("Failed to load shop orders.");
    }
  };

  // Fetch deliveries
  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/deliveries`
      );

      setDeliveries(response.data);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      setError("Failed to load delivery history.");
    }
  };

  // Fetch shops
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

  // Fetch products
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

  // Load all required data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchOrders(),
        fetchDeliveries(),
        fetchShops(),
        fetchProducts(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // Find latest delivered price for selected shop + product
  const findLatestDeliveredPrice = (shopId, productId) => {
    if (!shopId || !productId || deliveries.length === 0) {
      return null;
    }

    const matchingDeliveries = deliveries.filter((delivery) => {
      const sameShop =
        delivery.shop?._id === shopId;

      const sameProduct = delivery.items?.some(
        (item) => item.product?._id === productId
      );

      return sameShop && sameProduct;
    });

    if (matchingDeliveries.length === 0) {
      return null;
    }

    // Sort by actual delivery date - newest first
    matchingDeliveries.sort(
      (a, b) =>
        new Date(b.deliveredAt) -
        new Date(a.deliveredAt)
    );

    const latestDelivery = matchingDeliveries[0];

    const latestItem = latestDelivery.items.find(
      (item) => item.product?._id === productId
    );

    return latestItem || null;
  };

  // Handle shop / date / notes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({ ...previous, [name]: value }));

    // Shop changed: refresh the last delivered price of every product row
    if (name === "shop") {
      setFormItems((previous) =>
        previous.map((item) => applyLastPrice(value, item))
      );
    }
  };

  // Fill price from the last delivery to this shop (if any)
  const applyLastPrice = (shopId, item) => {
    if (!item.product) {
      return { ...item, priceNote: "" };
    }

    const latestItem = findLatestDeliveredPrice(shopId, item.product);

    if (latestItem) {
      return {
        ...item,
        pricePerKg: latestItem.pricePerKg,
        priceNote: `Last delivered price: ₹${latestItem.pricePerKg}/kg`,
      };
    }

    return {
      ...item,
      pricePerKg: "",
      priceNote: "No previous delivered price found.",
    };
  };

  const handleItemChange = (index, name, value) => {
    setFormItems((previous) =>
      previous.map((item, position) => {
        if (position !== index) {
          return item;
        }

        const updated = { ...item, [name]: value };

        return name === "product"
          ? applyLastPrice(formData.shop, updated)
          : updated;
      })
    );
  };

  const addItemRow = () =>
    setFormItems((previous) => [...previous, emptyItem()]);

  const removeItemRow = (index) =>
    setFormItems((previous) =>
      previous.length === 1
        ? previous
        : previous.filter((_, position) => position !== index)
    );

  // Reset form
  const resetForm = () => {
    setFormData({
      shop: "",
      orderDate: todayIndia(),
      notes: "",
    });

    setFormItems([emptyItem()]);
    setShowForm(false);
  };

  // Create shop order
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.shop) {
      setError("Please select a shop.");
      return;
    }

    for (const [index, item] of formItems.entries()) {
      if (
        !item.product ||
        !(Number(item.quantity) > 0) ||
        item.pricePerKg === "" ||
        !(Number(item.pricePerKg) >= 0)
      ) {
        setError(
          `Product row ${index + 1}: select the product and fill quantity and price.`
        );
        return;
      }
    }

    const summary = formItems
      .map((item) => {
        const product = products.find((p) => p._id === item.product);
        return `${product?.name || "Product"} - ${item.quantity} ${unitOf(product)}`;
      })
      .join("\n");

    const shopName = shops.find((x) => x._id === formData.shop)?.name;

    if (
      !window.confirm(
        `Save this order for ${shopName}?\n\n${summary}\n\nDate: ${formData.orderDate}`
      )
    ) {
      return;
    }

    try {
      setFormLoading(true);

      const orderData = {
        shop: formData.shop,
        items: formItems.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
          pricePerKg: Number(item.pricePerKg),
        })),
        orderDate: formData.orderDate
          ? `${formData.orderDate}T12:00:00+05:30`
          : undefined,
        notes: formData.notes,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/shop-orders`,
        orderData
      );

      setSuccess("Shop order created successfully!");

      resetForm();

      await fetchOrders();
    } catch (err) {
      console.error("Error creating shop order:", err);

      setError(
        err.response?.data?.message || "Failed to create shop order."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const calculateTotal = (items) => {
    return items.reduce((total, item) => {
      return (
        total +
        item.quantity * item.pricePerKg
      );
    }, 0);
  };

  if (loading) {
    return (
      <div className="container py-4">
        <h2>Shop Orders</h2>
        <p className="text-muted">
          Loading shop orders...
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
            Shop Orders
          </h2>

          <p className="text-muted mb-0">
            Manage orders received from shops.
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
            + New Order
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
          title="Edit Shop Order"
          path="/shop-orders"
          record={editing}
          fields={[
            {
              name: "shop",
              label: "Shop",
              type: "select",
              required: true,
              options: shops.map((x) => ({ value: x._id, label: x.name })),
            },
            { name: "orderDate", label: "Order date", type: "date", required: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initialValues={{
            shop: editing.shop?._id || "",
            orderDate: indiaDate(editing.orderDate),
            notes: editing.notes || "",
          }}
          itemsConfig={{ products, qtyKey: "quantity", qtyLabel: "Quantity (kg)" }}
          initialItems={editing.items.map((i) => ({
            product: i.product?._id || "",
            quantity: i.quantity,
            pricePerKg: i.pricePerKg,
          }))}
          onSaved={() => Promise.all([fetchOrders(), fetchDeliveries()])}
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

      {/* New Order Form */}
      {showForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">

            <h5 className="mb-4">
              Create New Shop Order
            </h5>

            <form onSubmit={handleSubmit}>

              <div className="row">

                {/* Shop */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Shop <span className="text-danger">*</span>
                  </label>

                  <SearchSelect
                    name="shop"
                    value={formData.shop}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Shop</option>

                    {shops.map((shop) => (
                      <option key={shop._id} value={shop._id}>
                        {shop.name} - {shop.ownerName}
                      </option>
                    ))}
                  </SearchSelect>
                </div>

                {/* Date */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">Order date</label>

                  <input
                    type="date"
                    name="orderDate"
                    value={formData.orderDate}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>

                {/* Products (many rows) */}
                <div className="col-12 mb-3">
                  <label className="form-label">
                    Products <span className="text-danger">*</span>
                  </label>

                  {formItems.map((item, index) => (
                    <div className="border rounded p-2 mb-2" key={index}>
                      <div className="row g-2">
                        <div className="col-12 col-md-5">
                          <SearchSelect
                            value={item.product}
                            onChange={(e) =>
                              handleItemChange(index, "product", e.target.value)
                            }
                            className="form-select"
                            required
                          >
                            <option value="">Select Product</option>

                            {products.map((product) => (
                              <option key={product._id} value={product._id}>
                                {product.name} - {product.brand}
                              </option>
                            ))}
                          </SearchSelect>
                        </div>

                        <div className="col-6 col-md-3">
                          <input
                            type="number"
                            className="form-control"
                            min="0.01"
                            step="0.01"
                            placeholder={`Quantity (${unitOf(products.find((p) => p._id === item.product))})`}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", e.target.value)
                            }
                          />
                        </div>

                        <div className="col-6 col-md-3">
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            step="0.01"
                            placeholder={`Price per ${unitOf(products.find((p) => p._id === item.product))} (₹)`}
                            value={item.pricePerKg}
                            onChange={(e) =>
                              handleItemChange(index, "pricePerKg", e.target.value)
                            }
                          />
                        </div>

                        <div className="col-12 col-md-1 d-grid">
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => removeItemRow(index)}
                            disabled={formItems.length === 1}
                            aria-label="Remove product"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {item.priceNote && (
                        <small className="text-muted">{item.priceNote}</small>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={addItemRow}
                  >
                    + Add another product
                  </button>
                </div>

                {/* Notes */}
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

              {/* Buttons */}
              <div className="d-flex gap-2">

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Creating..."
                    : "Create Order"}
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

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="alert alert-info">
          No shop orders found.
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-hover mb-0">

                <thead className="table-light">
                  <tr>
                    <th>Shop</th>
                    <th>Products</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Order Date</th>
                    <th>Status</th>
                  <ActionsHeader editMode={editMode} />
</tr>
                </thead>

                <tbody>
                  {newestFirst(orders, "orderDate").filter(matchesSearch(search)).map((order) => {
                    const totalAmount =
                      calculateTotal(
                        order.items
                      );

                    return (
                      <tr key={order._id}>

                        <td>
                          <strong>
                            {order.shop?.name ||
                              "Unknown Shop"}
                          </strong>

                          <br />

                          <small className="text-muted">
                            {order.shop
                              ?.ownerName || ""}
                          </small>
                        </td>

                        <td>
                          {order.items.map(
                            (item, index) => (
                              <div key={index}>
                                {item.product
                                  ?.name}{" "}
                                <span className="text-muted">
                                  (
                                  {item.product
                                    ?.brand}
                                  )
                                </span>
                              </div>
                            )
                          )}
                        </td>

                        <td>
                          {qtyByUnit(order.items, "quantity")}
                        </td>

                        <td>
                          ₹
                          {totalAmount.toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td>
                          {new Date(
                            order.orderDate
                          ).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              order.status ===
                              "completed"
                                ? "bg-success"
                                : order.status ===
                                  "pending"
                                ? "bg-warning text-dark"
                                : "bg-secondary"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                      <ActionsCell
  editMode={editMode}
  onEdit={() => setEditing(order)}
  onDelete={() =>
    deleteEntry({ path: "/shop-orders", id: order._id, label: "shop order", onDone: () => Promise.all([fetchOrders(), fetchDeliveries()]) })
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

export default ShopOrders;