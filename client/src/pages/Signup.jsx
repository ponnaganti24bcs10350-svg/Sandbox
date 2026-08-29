import { useState } from "react";

function Signup({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://sandbox-10.onrender.com/api/auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Signup failed");
        return;
      }

      localStorage.setItem("token", result.token);

      localStorage.setItem(
        "user",
        JSON.stringify(result.user)
      );

      onLogin();

    } catch (error) {
      console.error(error);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      {/* MOVING BACKGROUND */}
      <div className="auth-background">

        <div className="background-track">

          {/* COLUMN 1 */}
          <div className="bg-column column-up">
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />

            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
          </div>

          {/* COLUMN 2 */}
          <div className="bg-column column-down">
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />

            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
          </div>

          {/* COLUMN 3 */}
          <div className="bg-column column-up-slow">
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />

            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
          </div>

        </div>

      </div>

      {/* DARK OVERLAY */}
      <div className="background-overlay"></div>

      {/* SIGNUP CARD */}
      <div className="auth-card">

        <div className="auth-tabs">

          <button
            className="auth-tab"
            onClick={onLogin}
          >
            Sign In
          </button>

          <button className="auth-tab active">
            Sign Up
          </button>

        </div>

        <div className="auth-content">

          <h1>Create Account</h1>

          <p className="auth-subtitle">
            Sign up to start using Sandbox
          </p>

          <form onSubmit={handleSubmit}>

            <label>Name</label>

            <div className="input-wrapper">
              <span className="input-icon">👤</span>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <label>Email</label>

            <div className="input-wrapper">
              <span className="input-icon">✉</span>

              <input
                type="email"
                placeholder="Enter your email"
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
                ? "Creating Account..."
                : "Sign Up"}
            </button>

          </form>

          <p className="switch-auth">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onLogin}
            >
              Sign in
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Signup;