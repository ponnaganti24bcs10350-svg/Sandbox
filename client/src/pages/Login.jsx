import { useEffect, useState } from "react";
import { getApiUrl } from "../config/api";


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

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (window.google?.accounts?.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            handleGoogleAuthResponse({ credential: response.credential });
          },
        });
        const container = document.getElementById("google-btn-container");
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            width: "100%",
          });
        }
      } catch (e) {
        console.error("Google GIS Init Error:", e);
      }
    }
  }, []);


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
      sessionStorage.setItem("justLoggedIn", "true");

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
        setError(result.message || "Google Login failed");
        return;
      }

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
sessionStorage.setItem("justLoggedIn", "true");
      onLogin();
    } catch (error) {
      console.error(error);
      setError("Unable to connect to server for Google sign in");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "460149458220-h6hbupud5bp56ptat1q3i1am0b2cdfjj.apps.googleusercontent.com";

    if (!window.google) {
      console.error("Google Identity Services script (window.google) not loaded");
      setError(
        "Google Sign-In library failed to load. Please disable ad-blockers or refresh the page."
      );
      return;
    }

    if (window.google.accounts?.oauth2 && clientId) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile openid",
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              console.error("Google OAuth token error:", tokenResponse.error);
              setError(`Google Sign-In failed: ${tokenResponse.error}`);
              return;
            }
            if (tokenResponse?.access_token) {
              setLoading(true);
              try {
                const res = await fetch(
                  "https://www.googleapis.com/oauth2/v3/userinfo",
                  {
                    headers: {
                      Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                  }
                );
                const googleUser = await res.json();
                handleGoogleAuthResponse({
                  email: googleUser.email,
                  name: googleUser.name,
                  picture: googleUser.picture,
                  googleId: googleUser.sub,
                });
              } catch (err) {
                console.error("Failed to fetch Google user profile:", err);
                setError("Failed to retrieve Google account info");
                setLoading(false);
              }
            }
          },
          error_callback: (err) => {
            console.error("Google OAuth popup error:", err);
            setError("Google popup was closed or blocked by browser.");
          },
        });
        client.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (e) {
        console.error("Google initTokenClient error:", e);
      }
    }

    if (window.google.accounts?.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            handleGoogleAuthResponse({ credential: response.credential });
          },
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.warn("One Tap not displayed:", notification.getNotDisplayedReason());
            setError(
              `Google Sign-In prompt not displayed (${notification.getNotDisplayedReason()}). Please try again.`
            );
          }
        });
      } catch (e) {
        console.error("Google accounts.id prompt error:", e);
        setError("Failed to open Google Sign-In prompt.");
      }
    }
  }

  return (
    <div className="auth-page">

      {/* MOVING BACKGROUND */}
      <div className="auth-background">

        <div className="background-track">

          {/* COLUMN 1 */}
          <div className="bg-column column-up">
            <img
              src="/images/sunset.jpg"
              alt=""
            />
            <img
              src="/images/camera.jpg"
              alt=""
            />
            <img
              src="/images/ocean.jpg"
              alt=""
            />

            <img
              src="/images/sunset.jpg"
              alt=""
            />
            <img
              src="/images/camera.jpg"
              alt=""
            />
            <img
              src="/images/ocean.jpg"
              alt=""
            />
          </div>

          {/* COLUMN 2 */}
          <div className="bg-column column-down">
            <img
              src="/images/ocean.jpg"
              alt=""
            />
            <img
              src="/images/sunset.jpg"
              alt=""
            />
            <img
              src="/images/camera.jpg"
              alt=""
            />

            <img
              src="/images/ocean.jpg"
              alt=""
            />
            <img
              src="/images/sunset.jpg"
              alt=""
            />
            <img
              src="/images/camera.jpg"
              alt=""
            />
          </div>

          {/* COLUMN 3 */}
          <div className="bg-column column-up-slow">
            <img
              src="/images/camera.jpg"
              alt=""
            />
            <img
              src="/images/ocean.jpg"
              alt=""
            />
            <img
              src="/images/sunset.jpg"
              alt=""
            />

            <img
              src="/images/camera.jpg"
              alt=""
            />
            <img
              src="/images/ocean.jpg"
              alt=""
            />
            <img
              src="/images/sunset.jpg"
              alt=""
            />
          </div>

        </div>
      </div>

      {/* DARK OVERLAY */}
      <div className="background-overlay"></div>

      {/* LOGIN CARD */}
      <div className="auth-card">

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

        <div className="auth-content">

          <h1 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", margin: "0 0 8px" }}>
            Welcome <span style={{ fontStyle: "italic", color: "#e11d48" }}>back</span>
          </h1>

          <p className="auth-subtitle" style={{ textAlign: "center", color: "#64748b", marginBottom: "24px" }}>
            Log in to your Sandbox account.
          </p>

          {/* TOP GOOGLE BUTTON (WELLFOUND STYLE) */}
          <button
            type="button"
            className="google-button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              background: "#ffffff",
              fontSize: "15px",
              fontWeight: "600",
              color: "#0f172a",
              cursor: "pointer",
              marginBottom: "20px"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", margin: "20px 0", color: "#94a3b8", fontSize: "13px" }}>
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
            <span style={{ padding: "0 12px" }}>or continue with email</span>
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
          </div>

          {error && (
            <div style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: "10px",
              padding: "14px",
              fontSize: "14px",
              textAlign: "center",
              marginBottom: "16px",
              fontWeight: "500"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>Email</label>

            <div className="input-wrapper" style={{ marginBottom: "16px" }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none" }}
                required
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>Password</label>
              <span style={{ fontSize: "13px", color: "#64748b", textDecoration: "underline", cursor: "pointer" }}>Forgot password?</span>
            </div>

            <div className="input-wrapper" style={{ position: "relative", marginBottom: "20px" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                style={{ width: "100%", padding: "12px 14px", paddingRight: "60px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none", boxSizing: "border-box" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#0f172a",
                color: "#ffffff",
                padding: "14px",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "700",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

          </form>

          <p className="switch-auth" style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#64748b" }}>
            New to Sandbox?{" "}
            <button
              type="button"
              onClick={onSignup}
              style={{ background: "none", border: "none", color: "#0f172a", fontWeight: "700", textDecoration: "underline", cursor: "pointer" }}
            >
              Create an account
            </button>
          </p>

          <p className="switch-auth" style={{ textAlign: "center", marginTop: "10px", fontSize: "13px", color: "#64748b" }}>
            Are you a company?{" "}
            <button
              type="button"
              onClick={onCompanySignup}
              style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "600", cursor: "pointer" }}
            >
              Create company account
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;