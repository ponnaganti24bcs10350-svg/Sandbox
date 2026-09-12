import { useEffect, useState } from "react";
import { getApiUrl } from "../config/api";
import "./StudentInvitations.css";

function StudentInvitations({ onBack }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  async function fetchInvitations() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("You are not logged in");
      }

      const response = await fetch(`${getApiUrl()}/api/invitations/candidate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load invitations");
      }

      setInvitations(result.data || []);
    } catch (err) {
      console.error("Fetch invitations error:", err);
      setError(err.message || "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleResponse(id, status) {
    try {
      setRespondingId(id);
      const token = localStorage.getItem("token");

      const response = await fetch(`${getApiUrl()}/api/invitations/${id}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Failed to respond to invitation");
        return;
      }

      setInvitations((prev) =>
        prev.map((inv) => (inv._id === id ? { ...inv, status } : inv))
      );
    } catch (err) {
      console.error("Respond invitation error:", err);
      alert("Error responding to invitation");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="student-invitations-page">
      <div className="invitations-container">
        <header className="invitations-header">
          <div>
            <h1>📩 Company Invitations</h1>
            <p className="invitations-subtitle">
              Review interview and job invitations sent to you by hiring companies.
            </p>
          </div>
          {onBack && (
            <button className="back-btn" onClick={onBack}>
              ← Back to Challenges
            </button>
          )}
        </header>

        {loading ? (
          <div className="invitations-loading">
            <div className="spinner"></div>
            <p>Loading your invitations...</p>
          </div>
        ) : error ? (
          <div className="invitations-error">
            <p>{error}</p>
            <button onClick={fetchInvitations}>Try Again</button>
          </div>
        ) : invitations.length === 0 ? (
          <div className="empty-invitations">
            <div className="empty-icon">📫</div>
            <h3>No Invitations Received Yet</h3>
            <p>
              Keep practicing challenges to improve your ranking! Companies search for top-performing developers on Sandbox to send job invitations.
            </p>
          </div>
        ) : (
          <div className="invitations-list">
            {invitations.map((inv) => {
              const companyName = inv.company?.name || "Hiring Company";
              const initial = companyName.charAt(0).toUpperCase();
              const dateStr = new Date(inv.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div key={inv._id} className={`invitation-row ${inv.status}`}>
                  <div className="invitation-row-left">
                    <div className="company-avatar">{initial}</div>
                    <div className="company-details">
                      <h2>{companyName}</h2>
                      <span className="company-email">{inv.company?.email || ""}</span>
                    </div>
                  </div>

                  <div className="invitation-row-center">
                    <div className="position-info">
                      <span className="position-tag">{inv.position}</span>
                      <span className="received-date">• Sent on {dateStr}</span>
                    </div>
                    {inv.message && (
                      <p className="recruiter-message">"{inv.message}"</p>
                    )}
                  </div>

                  <div className="invitation-row-right">
                    <span className={`status-badge ${inv.status}`}>
                      {inv.status === "accepted"
                        ? "✓ Accepted"
                        : inv.status === "declined"
                        ? "✗ Rejected"
                        : "⏳ Pending"}
                    </span>

                    {inv.status === "pending" ? (
                      <div className="row-actions">
                        <button
                          className="accept-btn"
                          onClick={() => handleResponse(inv._id, "accepted")}
                          disabled={respondingId === inv._id}
                        >
                          {respondingId === inv._id ? "..." : "✓ Accept"}
                        </button>
                        <button
                          className="decline-btn"
                          onClick={() => handleResponse(inv._id, "declined")}
                          disabled={respondingId === inv._id}
                        >
                          {respondingId === inv._id ? "..." : "✗ Reject"}
                        </button>
                      </div>
                    ) : (
                      <div className="responded-text">
                        You {inv.status === "accepted" ? "accepted" : "rejected"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentInvitations;
