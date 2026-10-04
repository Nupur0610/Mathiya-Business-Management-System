import { useState } from "react";
import axios from "axios";
import { setToken } from "../services/auth";

function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { password }
      );
      setToken(res.data.token);
      onLogin();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not reach the server. If it was idle, wait a minute and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <form
        onSubmit={handleSubmit}
        className="card p-4 w-100"
        style={{ maxWidth: "380px" }}
      >
        <h4 className="mb-1">Mathiya</h4>
        <p className="text-muted mb-4">Business Management System</p>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="form-control mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />

        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default Login;
