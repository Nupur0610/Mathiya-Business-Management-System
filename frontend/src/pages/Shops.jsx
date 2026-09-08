
import { useEffect, useState } from "react";
import api from "../services/api";

function Shops() {
  const [shops, setShops] = useState([]);
  const [outstandings, setOutstandings] = useState({});
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    phone: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchShops = async () => {
    try {
      setLoading(true);

      const response = await api.get("/shops");
      setShops(response.data);

      const balances = {};

      await Promise.all(
        response.data.map(async (shop) => {
          try {
            const balanceResponse = await api.get(
              `/outstanding/shops/${shop._id}`
            );

            balances[shop._id] =
              balanceResponse.data.outstanding || 0;
          } catch {
            balances[shop._id] = 0;
          }
        })
      );

      setOutstandings(balances);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load shops."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.name ||
      !formData.ownerName ||
      !formData.phone ||
      !formData.address
    ) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/shops", formData);

      setSuccess("Shop added successfully.");

      setFormData({
        name: "",
        ownerName: "",
        phone: "",
        address: "",
      });

      setShowForm(false);

      await fetchShops();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to add shop."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      ownerName: "",
      phone: "",
      address: "",
    });

    setError("");
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="container py-4">
        <h2>Shops</h2>
        <p className="text-muted">Loading shops...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Shops</h2>
          <p className="text-muted mb-0">
            Manage shops and their outstanding balances.
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
            + Add Shop
          </button>
        )}
      </div>

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
            <h5 className="mb-4">Add Shop</h5>

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter shop name"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter owner name"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter address"
                    required
                  />
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Shop"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body p-0">
          {shops.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-muted mb-0">
                No shops found.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Shop</th>
                    <th>Owner</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>

                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop._id}>
                      <td>
                        <strong>{shop.name}</strong>
                      </td>

                      <td>{shop.ownerName || "-"}</td>

                      <td>{shop.phone || "-"}</td>

                      <td>{shop.address || "-"}</td>

                      <td>
                        <strong>
                          ₹
                          {Number(
                            outstandings[shop._id] || 0
                          ).toLocaleString("en-IN")}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Shops;

