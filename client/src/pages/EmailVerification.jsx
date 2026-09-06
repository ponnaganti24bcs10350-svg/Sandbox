import { useState, useEffect } from "react";
import { getApiUrl } from "../config/api";

export default function EmailVerification({
  email,
  name,
  password,
  role = "student",
  onVerified,
  onBack,
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const API_URL = getApiUrl();

  useEffect(() => {
    if (email && !sent) {
      handleSendCode();
    }
  }, [email]);

  async function handleSendCode() {
    setError("");
    setMessage("");
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send verification code");
      }

      setSent(true);
      if (data.testCode) {
        setMessage(`Code: ${data.testCode} (sent for testing)`);
      } else {
        setMessage(`Verification code sent to ${email}`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to send verification code");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!code || code.trim().length === 0) {
      setError("Please enter the verification code.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: code.trim(),
          name,
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Verification failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onVerified(data.user);
    } catch (err) {
      console.error(err);
      setError(err.message || "Verification code is invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* MOVING BACKGROUND */}
      <div className="auth-background">
        <div className="background-track">
          <div className="bg-column column-up">
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
          </div>
          <div className="bg-column column-down">
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
          </div>
          <div className="bg-column column-up-slow">
            <img src="/images/camera.jpg" alt="" />
            <img src="/images/ocean.jpg" alt="" />
            <img src="/images/sunset.jpg" alt="" />
            <img src="/images/camera.jpg" alt="" />
          </div>
        </div>
      </div>

      {/* DARK OVERLAY */}
      <div className="background-overlay"></div>

      {/* VERIFICATION CARD */}
      <div className="auth-card">
        <div className="auth-content">
          <h1>Verify Email</h1>
          <p className="auth-subtitle">
            Enter the verification code sent to <br />
            <strong style={{ color: "#38bdf8" }}>{email}</strong>
          </p>

          <form onSubmit={handleVerify}>
            <label>Verification Code</label>
            <div className="input-wrapper">
              <span className="input-icon">🔑</span>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            {message && (
              <p className="auth-subtitle" style={{ color: "#4ade80", marginTop: "14px", marginBottom: 0 }}>
                {message}
              </p>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>
          </form>

          <p className="switch-auth" style={{ marginTop: "24px" }}>
            Didn't receive code?{" "}
            <button type="button" onClick={handleSendCode} disabled={sending}>
              {sending ? "Sending..." : "Resend code"}
            </button>
          </p>

          {onBack && (
            <p className="switch-auth" style={{ marginTop: "8px" }}>
              <button type="button" onClick={onBack}>
                ← Back to Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
