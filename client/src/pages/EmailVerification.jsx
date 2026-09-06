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

  // Auto-send verification code on load if email is present
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
      setMessage(`A 6-digit verification code has been sent to ${email}`);
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
      setError("Please enter the 6-digit verification code.");
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
    <div className="auth-page verification-page" style={{ background: "#f3f5f8", minHeight: "100vh", padding: "40px 20px" }}>
      {/* WELLFOUND STEP BAR */}
      <div style={{
        maxWidth: "680px",
        margin: "0 auto 40px",
        background: "#ffffff",
        borderRadius: "30px",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid #e2e8f0",
        fontSize: "14px",
        color: "#64748b"
      }}>
        <span style={{ color: "#2563eb", fontWeight: "600", borderBottom: "2px solid #2563eb", paddingBottom: "2px" }}>
          Email Verification
        </span>
        <span>—</span>
        <span>Profile</span>
        <span>—</span>
        <span>Preferences</span>
        <span>—</span>
        <span>Culture</span>
        <span>—</span>
        <span>Resume/CV</span>
        <span>—</span>
        <span style={{ color: "#16a34a" }}>✓ Done</span>
      </div>

      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: "800", color: "#0f172a", margin: "0 0 12px" }}>
          Verify your email
        </h1>
        <p style={{ fontSize: "16px", color: "#475569", margin: 0 }}>
          Before completing your account setup, we need to verify your email address.
        </p>
      </div>

      {/* CARD */}
      <div style={{
        maxWidth: "520px",
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
        border: "1px solid #e2e8f0",
        textAlign: "center"
      }}>
        <p style={{ fontSize: "15px", color: "#334155", marginBottom: "20px" }}>
          Click the button below to receive a verification code by email at <strong>{email}</strong>
        </p>

        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending}
          style={{
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "24px",
            padding: "12px 32px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: sending ? "not-allowed" : "pointer",
            marginBottom: "28px",
            transition: "all 0.2s ease"
          }}
        >
          {sending ? "Sending Code..." : sent ? "Resend Verification Code" : "Send me a Verification Code"}
        </button>

        {message && (
          <p style={{ background: "#f0fdf4", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px" }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: "24px" }}>
            <input
              type="text"
              placeholder="Enter your verification code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "16px",
                textAlign: "center",
                letterSpacing: "2px",
                outline: "none",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Verifying..." : "Verify & Create Account"}
          </button>
        </form>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: "14px",
              marginTop: "20px",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            Back to Sign Up
          </button>
        )}
      </div>
    </div>
  );
}
