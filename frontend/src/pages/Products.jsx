import { useEffect, useState } from "react";
import axios from "axios";

function Products() {
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    unit: "kg",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [productsResponse, stockResponse] = await Promise.all([
        axios.get("http://localhost:5000/api/products"),
        axios.get("http://localhost:5000/api/stock"),
      ]);

      setProducts(productsResponse.data);
      setStock(stockResponse.data);
    } catch (err) {
      console.error("Error fetching products/stock:", err);
      setError("Failed to load products and stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      await axios.post(
        "http://localhost:5000/api/products",
        formData
      );

      setFormData({
        name: "",
        brand: "",
        unit: "kg",
      });

      setShowForm(false);

      fetchData();
    } catch (err) {
      console.error("Error adding product:", err);

      setError(
        err.response?.data?.message || "Failed to add product."
      );
    }
  };

  // Find stock for a particular product
  const getStockQuantity = (productId) => {
    const stockItem = stock.find(
      (item) => item.product === productId
    );

    return stockItem ? stockItem.quantity : 0;
  };

  return (
    <div className="container-fluid py-4">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h2 className="mb-1">
            Products & Stock
          </h2>

          <p className="text-muted mb-0">
            Manage products, brands and current stock.
          </p>
        </div>

        <button
          className="btn btn-dark"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Add Product"}
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* ADD PRODUCT FORM */}
      {showForm && (
        <div className="card shadow-sm mb-4">

          <div className="card-body">

            <h5 className="mb-3">
              Add New Product
            </h5>

            <form onSubmit={handleSubmit}>

              <div className="row">

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Product Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="e.g. Mathiya"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Brand
                  </label>

                  <input
                    type="text"
                    name="brand"
                    className="form-control"
                    placeholder="e.g. Yash"
                    value={formData.brand}
                    onChange={handleChange}
                  />

                </div>

                <div className="col-md-4 mb-3">

                  <label className="form-label">
                    Unit
                  </label>

                  <select
                    name="unit"
                    className="form-select"
                    value={formData.unit}
                    onChange={handleChange}
                  >
                    <option value="kg">
                      Kilogram (kg)
                    </option>

                    <option value="packet">
                      Packet
                    </option>

                    <option value="piece">
                      Piece
                    </option>

                  </select>

                </div>

              </div>

              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Product
              </button>

            </form>

          </div>

        </div>
      )}

      {/* PRODUCTS TABLE */}
      {loading ? (

        <div className="text-center py-5">

          <div
            className="spinner-border"
            role="status"
          ></div>

          <p className="mt-2 text-muted">
            Loading products...
          </p>

        </div>

      ) : (

        <div className="card shadow-sm">

          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-hover mb-0">

                <thead className="table-light">

                  <tr>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Unit</th>
                    <th>Current Stock</th>
                  </tr>

                </thead>

                <tbody>

                  {products.length === 0 ? (

                    <tr>

                      <td
                        colSpan="4"
                        className="text-center py-4 text-muted"
                      >
                        No products found.
                      </td>

                    </tr>

                  ) : (

                    products.map((product) => (

                      <tr key={product._id}>

                        <td>
                          <strong>
                            {product.name}
                          </strong>
                        </td>

                        <td>
                          {product.brand || "-"}
                        </td>

                        <td>
                          {product.unit || "kg"}
                        </td>

                        <td>

                          <strong>
                            {getStockQuantity(product._id)}
                          </strong>{" "}

                          {product.unit || "kg"}

                        </td>

                      </tr>

                    ))

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

export default Products;