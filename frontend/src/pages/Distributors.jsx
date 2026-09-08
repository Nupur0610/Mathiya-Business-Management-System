import { useEffect, useState } from "react";
import api from "../services/api";

function Distributors() {
const [distributors, setDistributors] = useState([]);

const [loading, setLoading] = useState(true);
const [formLoading, setFormLoading] = useState(false);

const [showForm, setShowForm] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const [formData, setFormData] = useState({
name: "",
phone: "",
address: "",
});

// ==============================
// FETCH DISTRIBUTORS
// ==============================

const fetchDistributors = async () => {
try {
setLoading(true);
setError("");


  const response = await api.get("/distributors");

  setDistributors(response.data);
} catch (err) {
  console.error(
    "Error fetching distributors:",
    err
  );

  setError(
    err.response?.data?.message ||
      "Failed to load distributors."
  );
} finally {
  setLoading(false);
}


};

// ==============================
// LOAD DISTRIBUTORS
// ==============================

useEffect(() => {
fetchDistributors();
}, []);

// ==============================
// HANDLE CHANGE
// ==============================

const handleChange = (e) => {
const { name, value } = e.target;


setFormData((previous) => ({
  ...previous,
  [name]: value,
}));


};

// ==============================
// RESET FORM
// ==============================

const resetForm = () => {
setFormData({
name: "",
phone: "",
address: "",
});


setShowForm(false);
setError("");


};

// ==============================
// CREATE DISTRIBUTOR
// ==============================

const handleSubmit = async (e) => {
e.preventDefault();


setError("");
setSuccess("");

if (!formData.name.trim()) {
  setError("Distributor name is required.");
  return;
}

try {
  setFormLoading(true);

  await api.post("/distributors", {
    name: formData.name.trim(),
    phone: formData.phone.trim(),
    address: formData.address.trim(),
  });

  setSuccess(
    "Distributor added successfully."
  );

  resetForm();

  await fetchDistributors();
} catch (err) {
  console.error(
    "Error creating distributor:",
    err
  );

  setError(
    err.response?.data?.message ||
      err.response?.data?.error ||
      "Failed to add distributor."
  );
} finally {
  setFormLoading(false);
}


};

// ==============================
// FORMAT DATE
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
// LOADING
// ==============================

if (loading) {
return ( <div className="container py-4"> <h2 className="mb-1">
Distributors </h2>


    <p className="text-muted">
      Manage distributors and their outstanding
      balances.
    </p>

    <div className="alert alert-info">
      Loading distributors...
    </div>
  </div>
);


}

// ==============================
// UI
// ==============================

return ( <div className="container py-4">


  {/* HEADER */}

  <div className="d-flex justify-content-between align-items-center mb-4">

    <div>
      <h2 className="mb-1">
        Distributors
      </h2>

      <p className="text-muted mb-0">
        Manage distributors and their outstanding
        balances.
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
        + Add Distributor
      </button>
    )}

  </div>

  {/* ERROR */}

  {error && (
    <div className="alert alert-danger">
      {error}
    </div>
  )}

  {/* SUCCESS */}

  {success && (
    <div className="alert alert-success">
      {success}
    </div>
  )}

  {/* ADD DISTRIBUTOR FORM */}

  {showForm && (
    <div className="card shadow-sm mb-4">

      <div className="card-body">

        <h5 className="mb-4">
          Add New Distributor
        </h5>

        <form onSubmit={handleSubmit}>

          <div className="row">

            {/* NAME */}

            <div className="col-md-6 mb-3">

              <label className="form-label">
                Distributor Name{" "}
                <span className="text-danger">
                  *
                </span>
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter distributor name"
                required
              />

            </div>

            {/* PHONE */}

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
              />

            </div>

            {/* ADDRESS */}

            <div className="col-md-12 mb-3">

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
              />

            </div>

          </div>

          {/* BUTTONS */}

          <div className="d-flex gap-2">

            <button
              type="submit"
              className="btn btn-success"
              disabled={formLoading}
            >
              {formLoading
                ? "Saving..."
                : "Save Distributor"}
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

  {/* SUMMARY */}

  <div className="row mb-4">

    <div className="col-md-4 mb-3">

      <div className="card shadow-sm h-100">

        <div className="card-body">

          <p className="text-muted mb-1">
            Total Distributors
          </p>

          <h3 className="mb-0">
            {distributors.length}
          </h3>

        </div>

      </div>

    </div>

    <div className="col-md-4 mb-3">

      <div className="card shadow-sm h-100">

        <div className="card-body">

          <p className="text-muted mb-1">
            Active Distributors
          </p>

          <h3 className="mb-0">
            {
              distributors.filter(
                (distributor) =>
                  distributor.isActive !== false
              ).length
            }
          </h3>

        </div>

      </div>

    </div>

    <div className="col-md-4 mb-3">

      <div className="card shadow-sm h-100">

        <div className="card-body">

          <p className="text-muted mb-1">
            Inactive Distributors
          </p>

          <h3 className="mb-0">
            {
              distributors.filter(
                (distributor) =>
                  distributor.isActive === false
              ).length
            }
          </h3>

        </div>

      </div>

    </div>

  </div>

  {/* DISTRIBUTOR LIST */}

  <div className="mb-3">

    <h4>
      Distributor List
    </h4>

    <p className="text-muted">
      All distributors registered in the
      system.
    </p>

  </div>

  {distributors.length === 0 ? (

    <div className="alert alert-info">
      No distributors found.
    </div>

  ) : (

    <div className="card shadow-sm">

      <div className="card-body p-0">

        <div className="table-responsive">

          <table className="table table-hover mb-0">

            <thead className="table-light">

              <tr>

                <th>
                  Distributor
                </th>

                <th>
                  Phone
                </th>

                <th>
                  Address
                </th>

                <th>
                  Status
                </th>

                <th>
                  Added
                </th>

              </tr>

            </thead>

            <tbody>

              {distributors.map(
                (distributor) => (

                  <tr
                    key={
                      distributor._id
                    }
                  >

                    <td>
                      <strong>
                        {
                          distributor.name
                        }
                      </strong>
                    </td>

                    <td>
                      {
                        distributor.phone ||
                        "-"
                      }
                    </td>

                    <td>
                      {
                        distributor.address ||
                        "-"
                      }
                    </td>

                    <td>

                      <span
                        className={`badge ${
                          distributor.isActive !==
                          false
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {distributor.isActive !==
                        false
                          ? "Active"
                          : "Inactive"}
                      </span>

                    </td>

                    <td>
                      {formatDate(
                        distributor.createdAt
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

export default Distributors;
