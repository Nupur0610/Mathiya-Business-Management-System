import { useEffect, useState } from "react";
import axios from "axios";

function ShopOrders() {
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

  const [formData, setFormData] = useState({
    shop: "",
    product: "",
    quantity: "",
    pricePerKg: "",
    notes: "",
  });

  // Fetch shop orders
  const fetchOrders = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/shop-orders"
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
        "http://localhost:5000/api/deliveries"
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
        "http://localhost:5000/api/shops"
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
        "http://localhost:5000/api/products"
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

  // Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => {
      const updatedData = {
        ...previous,
        [name]: value,
      };

      // When shop or product changes,
      // find the latest ACTUAL DELIVERY price
      if (name === "shop" || name === "product") {
        const selectedShop =
          name === "shop"
            ? value
            : previous.shop;

        const selectedProduct =
          name === "product"
            ? value
            : previous.product;

        const latestItem =
          findLatestDeliveredPrice(
            selectedShop,
            selectedProduct
          );

        if (latestItem) {
          updatedData.pricePerKg =
            latestItem.pricePerKg;

          setPriceSource(
            `Last delivered price: ₹${latestItem.pricePerKg}/kg`
          );
        } else {
          updatedData.pricePerKg = "";

          setPriceSource(
            "No previous delivered price found."
          );
        }
      }

      return updatedData;
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      shop: "",
      product: "",
      quantity: "",
      pricePerKg: "",
      notes: "",
    });

    setPriceSource("");
    setShowForm(false);
  };

  // Create shop order
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.shop ||
      !formData.product ||
      !formData.quantity ||
      !formData.pricePerKg
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setFormLoading(true);

      const orderData = {
        shop: formData.shop,
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
        "http://localhost:5000/api/shop-orders",
        orderData
      );

      setSuccess(
        "Shop order created successfully!"
      );

      resetForm();

      await fetchOrders();
    } catch (err) {
      console.error(
        "Error creating shop order:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to create shop order."
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
                    Shop{" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <select
                    name="shop"
                    value={formData.shop}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">
                      Select Shop
                    </option>

                    {shops.map((shop) => (
                      <option
                        key={shop._id}
                        value={shop._id}
                      >
                        {shop.name} -{" "}
                        {shop.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Product{" "}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <select
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
                  </select>
                </div>

                {/* Quantity */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Quantity (kg){" "}
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

                {/* Price */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Price per kg (₹){" "}
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
                    placeholder="Enter price per kg"
                  />

                  {priceSource && (
                    <small className="text-muted">
                      {priceSource}
                    </small>
                  )}
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
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => {
                    const totalQuantity =
                      order.items.reduce(
                        (total, item) =>
                          total + item.quantity,
                        0
                      );

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
                          {totalQuantity} kg
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