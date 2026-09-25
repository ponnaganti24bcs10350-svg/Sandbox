import { useEffect, useState } from "react";
import { getApiUrl } from "../config/api";
import "./Login.css";
import { auth, googleProvider } from "../config/firebase";
import { signInWithPopup } from "firebase/auth";

function Login({
  onSignup,
  onCompanySignup,
  onLogin,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/auth/login`,
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

      sessionStorage.setItem(
        "justLoggedIn",
        "true"
      );

      onLogin();
    } catch (error) {
      console.error(error);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuthResponse(googleData) {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ||
          "Google Login failed"
        );
        return;
      }

      localStorage.setItem(
        "token",
        result.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(result.user)
      );

      sessionStorage.setItem(
        "justLoggedIn",
        "true"
      );

      onLogin();
    } catch (error) {
      console.error(error);

      setError(
        "Unable to connect to server for Google sign in"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError("");

      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      const idToken =
        await result.user.getIdToken();

      await handleGoogleAuthResponse({
        credential: idToken,
      });
    } catch (error) {
      console.error(
        "Firebase Google Auth Error:",
        error
      );

      setError(
        "Google popup was closed or authentication failed."
      );

      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      {/* =================================================
          LEFT BRAND / IMAGE PANEL
      ================================================= */}

     

      {/* =================================================
          RIGHT LOGIN PANEL
      ================================================= */}

      <section className="auth-form-panel">

        <div className="auth-form-container">

          {/* BRAND */}

          <div className="auth-mobile-logo">
            Sandbox
          </div>


          {/* TABS */}

          <div className="auth-tabs">

            <button
              type="button"
              className="auth-tab active"
            >
              Sign In
            </button>

            <button
              type="button"
              className="auth-tab"
              onClick={onSignup}
            >
              Sign Up
            </button>

          </div>


          {/* HEADING */}

          <div className="auth-heading">

            <span>
              WELCOME BACK
            </span>

            <h2>
              Sign in to
              <br />
              Sandbox.
            </h2>

            <p>
              Continue building your
              engineering profile.
            </p>

          </div>


          {/* GOOGLE */}

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >

            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />

              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />

              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />

              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>

            <span>
              Continue with Google
            </span>

          </button>


          {/* DIVIDER */}

          <div className="auth-divider">

            <span />

            <p>
              OR CONTINUE WITH EMAIL
            </p>

            <span />

          </div>


          {/* ERROR */}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}


          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >

            <div className="auth-field">

              <label>
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

            </div>


            <div className="auth-field">

              <div className="password-label">

                <label>
                  Password
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
              />

            </div>


            {/* LOGIN */}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Log in"}
            </button>

          </form>


          {/* SIGNUP */}

          <p className="switch-auth">

            New to Sandbox?

            <button
              type="button"
              onClick={onSignup}
            >
              Create an account
            </button>

          </p>


          {/* COMPANY */}

          <p className="switch-auth company-link">

            Are you a company?

            <button
              type="button"
              onClick={onCompanySignup}
            >
              Create company account
            </button>

          </p>

        </div>

      </section>

    </div>
  );
}

export default Login;