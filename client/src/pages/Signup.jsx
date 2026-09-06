import { useState } from "react";
import { getApiUrl } from "../config/api";


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
        `${getApiUrl()}/api/auth/signup`,
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

      localStorage.setItem(
        "token",
        result.token
      );

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
        setError(result.message || "Google Signup failed");
        return;
      }

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      onLogin();
    } catch (error) {
      console.error(error);
      setError("Unable to connect to server for Google authentication");
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
            type="button"
            className="auth-tab"
            onClick={onLogin}
          >
            Sign In
          </button>

          <button
            type="button"
            className="auth-tab active"
          >
            Sign Up
          </button>

        </div>

        <div className="auth-content">

          <h1>Create Account</h1>

          <p className="auth-subtitle">
            Sign up to start practicing code
          </p>

          <form onSubmit={handleSubmit}>

            <label>Full Name</label>

            <div className="input-wrapper">
              <span className="input-icon">
                👤
              </span>

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />
            </div>

            <label>Email</label>

            <div className="input-wrapper">
              <span className="input-icon">
                ✉
              </span>

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

            <label>Password</label>

            <div className="input-wrapper">
              <span className="input-icon">
                🔒
              </span>

              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
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

          <div className="auth-divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

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