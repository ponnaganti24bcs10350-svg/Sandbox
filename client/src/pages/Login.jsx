import { useState } from "react";

function Login({ onSignup, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(
        "https://sandbox-10.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Login failed");
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

            {/* EXACT DUPLICATE */}
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
          </div>

          {/* COLUMN 2 */}
          <div className="bg-column column-down">
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />

            {/* EXACT DUPLICATE */}
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
          </div>

          {/* COLUMN 3 */}
          <div className="bg-column column-up-slow">
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />

            {/* EXACT DUPLICATE */}
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
          </div>

        </div>

      </div>

      {/* DARK OVERLAY */}
      <div className="background-overlay"></div>

      {/* LOGIN CARD */}
      <div className="auth-card">

        {/* TABS */}
        <div className="auth-tabs">

          <button className="auth-tab active">
            Sign In
          </button>

          <button
            className="auth-tab"
            onClick={onSignup}
          >
            Sign Up
          </button>

        </div>

        <div className="auth-content">

          <h1>Welcome Back</h1>

          <p className="auth-subtitle">
            Sign in to continue to Sandbox
          </p>

          <form onSubmit={handleSubmit}>

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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="auth-error">
                {error}
              </p>
            )}

            <div className="forgot-password">
              Forgot password?
            </div>

            <button
              type="submit"
              className="auth-submit"
            >
              Sign In
            </button>

          </form>

          <div className="auth-divider">
            <span></span>
            <p>or</p>
            <span></span>
          </div>

          <button
            type="button"
            className="google-button"
          >
            <span className="google-icon">G</span>
            Continue with Google
          </button>

          <p className="switch-auth">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onSignup}
            >
              Sign up
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;