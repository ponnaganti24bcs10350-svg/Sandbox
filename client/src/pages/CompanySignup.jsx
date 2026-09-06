import { useState } from "react";
import { getApiUrl } from "../config/api";

const API_URL = getApiUrl();


export default function CompanySignup({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: "company",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Company signup failed"
        );
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Company signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-content">
          <h1>Create Company Account</h1>

          <p className="auth-subtitle">
            Create your company account on Sandbox
          </p>

          <form onSubmit={handleSignup}>
            <label>Company Name</label>

            <div className="input-wrapper">
              <span className="input-icon">🏢</span>

              <input
                type="text"
                placeholder="Enter company name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <label>Company Email</label>

            <div className="input-wrapper">
              <span className="input-icon">✉</span>

              <input
                type="email"
                placeholder="Enter company email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label>Password</label>

            <div className="input-wrapper">
              <span className="input-icon">🔒</span>

              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="auth-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Creating Company..."
                : "Create Company Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}