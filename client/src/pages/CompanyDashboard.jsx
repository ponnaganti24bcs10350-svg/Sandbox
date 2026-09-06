import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../config/api";
import "./CompanyDashboard.css";

const API_URL = getApiUrl();


function CompanyDashboard({ user, onLogout }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("All skills");
  const [minimumScore, setMinimumScore] = useState("Any score");
  const [verification, setVerification] = useState("All candidates");

  // Invitations
  const [invitations, setInvitations] = useState([]);
  const [invitationLoading, setInvitationLoading] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [position, setPosition] = useState("");
  const [message, setMessage] = useState("");

  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Navigation tab state with reload persistence
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("company_active_tab") || "dashboard";
  });

  function changeTab(tabName) {
    setActiveTab(tabName);
    sessionStorage.setItem("company_active_tab", tabName);
  }

  const acceptedInvitationsCount = invitations.filter(
    (invitation) => invitation.status === "accepted"
  ).length;


  // --------------------------------------------------
  // FETCH CANDIDATES
  // --------------------------------------------------

  useEffect(() => {
    async function fetchCandidates() {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_URL}/api/leaderboard`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to fetch candidates"
          );
        }

        setCandidates(result.data || []);
      } catch (error) {
        console.error(
          "Failed to load candidates:",
          error
        );

        setCandidates([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCandidates();
  }, []);

  // --------------------------------------------------
  // FETCH COMPANY INVITATIONS
  // --------------------------------------------------

  async function fetchInvitations() {
    try {
      setInvitationLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/invitations/company`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch invitations"
        );
      }

      setInvitations(result.data || []);
    } catch (error) {
      console.error(
        "Failed to load invitations:",
        error
      );
    } finally {
      setInvitationLoading(false);
    }
  }

  useEffect(() => {
    fetchInvitations();
  }, []);

  // --------------------------------------------------
  // SCORE
  // --------------------------------------------------

  const getOverallScore = (candidate) => {
    if (candidate.overallScore !== undefined) {
      return candidate.overallScore;
    }

    const javascript =
      candidate.javascriptScore || 0;

    const react =
      candidate.reactScore || 0;

    return Math.round(
      (javascript + react) / 2
    );
  };

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const name =
        candidate.username || "";

      const normalizedSearch =
        search.trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        name
          .toLowerCase()
          .includes(normalizedSearch);

      const javascript =
        candidate.javascriptScore || 0;

      const react =
        candidate.reactScore || 0;

      const overall =
        getOverallScore(candidate);

      let matchesSkill = true;

      if (skill === "JavaScript") {
        matchesSkill = javascript > 0;
      }

      if (skill === "React") {
        matchesSkill = react > 0;
      }

      if (skill === "Backend") {
        matchesSkill = false;
      }

      let matchesMinimumScore = true;

      if (minimumScore === "70+") {
        matchesMinimumScore = overall >= 70;
      }

      if (minimumScore === "80+") {
        matchesMinimumScore = overall >= 80;
      }

      if (minimumScore === "90+") {
        matchesMinimumScore = overall >= 90;
      }

      let matchesVerification = true;

      if (verification === "Verified only") {
        matchesVerification = false;
      }

      return (
        matchesSearch &&
        matchesSkill &&
        matchesMinimumScore &&
        matchesVerification
      );
    });
  }, [
    candidates,
    search,
    skill,
    minimumScore,
    verification,
  ]);

  function resetFilters() {
    setSearch("");
    setSkill("All skills");
    setMinimumScore("Any score");
    setVerification("All candidates");
  }

  // --------------------------------------------------
  // INVITATION
  // --------------------------------------------------

  function openInviteModal(candidate) {
    setSelectedCandidate(candidate);

    setPosition("");
    setMessage("");

    setInviteMessage("");
    setInviteError("");

    setShowInviteModal(true);
  }

  function closeInviteModal() {
    if (inviteSending) {
      return;
    }

    setShowInviteModal(false);
    setSelectedCandidate(null);

    setPosition("");
    setMessage("");

    setInviteMessage("");
    setInviteError("");
  }

  async function sendInvitation(e) {
    e.preventDefault();

    if (!selectedCandidate) {
      return;
    }

    if (!position.trim()) {
      setInviteError(
        "Please enter a position."
      );
      return;
    }

    try {
      setInviteSending(true);
      setInviteError("");
      setInviteMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "You are not logged in."
        );
      }

      if (!selectedCandidate.userId) {
        throw new Error(
          "Candidate ID is missing."
        );
      }

      const response = await fetch(
        `${API_URL}/api/invitations`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            candidateId:
              selectedCandidate.userId,

            position: position.trim(),

            message: message.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to send invitation"
        );
      }

      setInviteMessage(
        "Invitation sent successfully!"
      );

      await fetchInvitations();

      setTimeout(() => {
        setShowInviteModal(false);
        setSelectedCandidate(null);
        setPosition("");
        setMessage("");
        setInviteMessage("");
      }, 1200);
    } catch (error) {
      console.error(
        "Failed to send invitation:",
        error
      );

      setInviteError(
        error.message ||
          "Failed to send invitation."
      );
    } finally {
      setInviteSending(false);
    }
  }

  // --------------------------------------------------
  // CHECK WHETHER CANDIDATE ALREADY HAS INVITATION
  // --------------------------------------------------

  function getCandidateInvitation(candidate) {
    if (!candidate) return null;
    const candidateId = candidate._id || candidate.userId || candidate.id;
    const candidateEmail = (candidate.email || candidate.username || "").toLowerCase();

    return invitations.find((invitation) => {
      const invCandidateId = invitation.candidate?._id || invitation.candidate;
      const invCandidateEmail = (invitation.candidateEmail || invitation.candidate?.email || "").toLowerCase();

      return (
        (candidateId && invCandidateId && invCandidateId.toString() === candidateId.toString()) ||
        (candidateEmail && invCandidateEmail && candidateEmail === invCandidateEmail)
      );
    });
  }

  const pendingInvitations =
    invitations.filter(
      (invitation) =>
        invitation.status === "pending"
    );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="company-dashboard">

      {/* SIDEBAR */}

      <aside className="company-sidebar">

        <div className="company-logo">
          <div className="logo-icon">
            &lt;/&gt;
          </div>

          <span>SANDBOX</span>
        </div>

        <nav className="company-nav">

          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => changeTab("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <p className="nav-section">
            CANDIDATES
          </p>

          <button className="nav-item">
            <span>♙</span>
            All Candidates
          </button>

          <button className="nav-item">
            <span>★</span>
            Top Candidates
          </button>

          <button className="nav-item">
            <span>♡</span>
            Shortlisted
          </button>

          <p className="nav-section">
            CHALLENGES
          </p>

          <button className="nav-item">
            <span>□</span>
            Post Challenge
            <strong>+</strong>
          </button>

          <button className="nav-item">
            <span>□</span>
            My Challenges
          </button>

          <button className="nav-item">
            <span>☷</span>
            Submissions
          </button>

          <p className="nav-section">
            HIRING
          </p>

          <button
            className={`nav-item ${activeTab === "invitations" ? "active" : ""}`}
            onClick={() => changeTab("invitations")}
          >
            <span>✉</span>
            Invitations

            {pendingInvitations.length > 0 && (
              <strong>
                {pendingInvitations.length}
              </strong>
            )}
          </button>

          <button className="nav-item">
            <span>□</span>
            Interviews
          </button>

          <p className="nav-section">
            SETTINGS
          </p>

          <button className="nav-item">
            <span>⚙</span>
            Company Profile
          </button>

          <button className="nav-item">
            <span>⚙</span>
            Settings
          </button>

        </nav>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          ↪ Logout
        </button>

      </aside>

      {/* MAIN */}

      <main className="company-main">

        {/* HEADER */}

        <header className="company-header">

          <div>
            <h1>
              Welcome back,{" "}
              {user?.name || "Company"} 👋
            </h1>

            <p>
              Find and hire the best
              developers on Sandbox
            </p>
          </div>

          <div className="company-header-right">

            <div className="candidate-search">
              <span>⌕</span>

              <input
                placeholder="Search candidates by name, skill..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <button className="notification-button">
              ♧
              <span>
                {pendingInvitations.length}
              </span>
            </button>

            <div className="company-avatar">
              {(user?.name || "C")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="company-info">
              <strong>
                {user?.name || "Company"}
              </strong>

              <small>Company</small>
            </div>

          </div>

        </header>

        {/* STATS */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon purple">
              ♙
            </div>

            <div>
              <span>Total Candidates</span>

              <strong>
                {candidates.length}
              </strong>

              <small>
                Students on Sandbox
              </small>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon yellow">
              ★
            </div>

            <div>
              <span>Top Candidates</span>

              <strong>
                {Math.min(
                  candidates.length,
                  10
                )}
              </strong>

              <small>
                Highest performing
              </small>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon blue">
              ➤
            </div>

            <div>
              <span>Invitations Sent</span>

              <strong>
                {invitations.length}
              </strong>

              <small>
                {invitationLoading
                  ? "Loading..."
                  : invitations.length === 0
                  ? "No invitations yet"
                  : `${pendingInvitations.length} pending`}
              </small>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div>
              <span>Invitations Accepted</span>

              <strong>
                {acceptedInvitationsCount}
              </strong>

              <small>
                Accepted candidates
              </small>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon purple">
              □
            </div>

            <div>
              <span>Interviews</span>

              <strong>0</strong>

              <small>
                Scheduled interviews
              </small>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div>
              <span>Hires Made</span>

              <strong>0</strong>

              <small>
                Successful hires
              </small>
            </div>

          </div>

        </section>

        {/* CONTENT GRID - DASHBOARD TAB */}

        {activeTab === "dashboard" && (
          <>
            <section className="dashboard-grid">

              {/* TOP CANDIDATES */}

              <div className="dashboard-card candidates-card">

                <div className="card-header">

                  <div>
                    <h2>
                      Top 10 Candidates
                    </h2>

                    <p>
                      Highest performing developers
                    </p>
                  </div>

                  <button className="text-button">
                    View all candidates →
                  </button>

                </div>

                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Candidate</th>
                        <th>Overall</th>
                        <th>JavaScript</th>
                        <th>React</th>
                        <th>Challenges</th>
                        <th>Accepted</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>

                      {loading ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="loading-cell"
                          >
                            Loading candidates...
                          </td>
                        </tr>
                      ) : filteredCandidates.length ===
                        0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="loading-cell"
                          >
                            No candidates available.
                          </td>
                        </tr>
                      ) : (
                        filteredCandidates
                          .slice(0, 10)
                          .map(
                            (
                              candidate,
                              index
                            ) => {

                              const score =
                                getOverallScore(
                                  candidate
                                );

                              const existingInvitation =
                                getCandidateInvitation(
                                  candidate
                                );

                              return (
                                <tr
                                  key={
                                    candidate.userId ||
                                    index
                                  }
                                >

                                  <td>
                                    <span className="rank-number">
                                      {index + 1}
                                    </span>
                                  </td>

                                  <td>

                                    <div className="candidate-name">

                                      <div className="candidate-avatar">
                                        {(
                                          candidate.username ||
                                          "U"
                                        )
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>

                                      <div>

                                        <strong>
                                          {candidate.username ||
                                            "Developer"}
                                        </strong>

                                        <small>
                                          Developer
                                        </small>

                                      </div>

                                    </div>

                                  </td>

                                  <td>
                                    <strong className="score">
                                      {score}
                                    </strong>
                                  </td>

                                  <td>
                                    {candidate.javascriptScore ??
                                      0}
                                  </td>

                                  <td>
                                    {candidate.reactScore ??
                                      0}
                                  </td>

                                  <td>
                                    {candidate.totalSolved ??
                                      0}
                                  </td>

                                  <td>
                                    {existingInvitation ? (
                                      existingInvitation.status === "accepted" ? (
                                        <span
                                          title="Accepted"
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "50%",
                                            backgroundColor: "#dcfce7",
                                            color: "#16a34a",
                                            fontWeight: "bold",
                                            fontSize: "14px",
                                          }}
                                        >
                                          ✓
                                        </span>
                                      ) : existingInvitation.status === "declined" ? (
                                        <span
                                          title="Rejected"
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "50%",
                                            backgroundColor: "#fee2e2",
                                            color: "#dc2626",
                                            fontWeight: "bold",
                                            fontSize: "14px",
                                          }}
                                        >
                                          ✗
                                        </span>
                                      ) : (
                                        <span
                                          title="Pending"
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            backgroundColor: "#fef3c7",
                                            color: "#d97706",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          Pending
                                        </span>
                                      )
                                    ) : (
                                      <span
                                        style={{
                                          color: "#9aa0ae",
                                          fontSize: "14px",
                                        }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>

                                  <td>
                                    {existingInvitation?.status === "accepted" ? (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          color: "#16a34a",
                                          fontWeight: "600",
                                          fontSize: "13px",
                                        }}
                                      >
                                        Accepted
                                      </span>
                                    ) : existingInvitation?.status === "declined" ? (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          color: "#dc2626",
                                          fontWeight: "600",
                                          fontSize: "13px",
                                        }}
                                      >
                                        Declined
                                      </span>
                                    ) : (
                                      <button
                                        className="more-button"
                                        type="button"
                                        title="Invite candidate"
                                        onClick={() =>
                                          openInviteModal(
                                            candidate
                                          )
                                        }
                                      >
                                        ⋮
                                      </button>
                                    )}
                                  </td>

                                </tr>
                              );
                            }
                          )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* RIGHT COLUMN */}

              <div className="right-column">

                {/* POST A NEW CHALLENGE CARD */}

                <div className="dashboard-card post-challenge-card">

                  <h2>Post a New Challenge</h2>

                  <p>
                    Create a real engineering challenge and evaluate developers.
                  </p>

                  <div className="challenge-features">

                    <div>
                      <span>+</span>
                      <div>
                        <strong>Custom Challenges</strong>
                        <small>Create your own problems</small>
                      </div>
                    </div>

                    <div>
                      <span>✓</span>
                      <div>
                        <strong>Real Skill Evaluation</strong>
                        <small>Test practical engineering ability</small>
                      </div>
                    </div>

                    <div>
                      <span>↗</span>
                      <div>
                        <strong>Challenge Analytics</strong>
                        <small>Track submissions and results</small>
                      </div>
                    </div>

                  </div>

                  <button className="post-button" type="button">
                    + Post New Challenge
                  </button>

                </div>

                {/* FIND CANDIDATES FILTERS CARD */}

                <div className="dashboard-card filters-card">

                  <div className="card-header">
                    <div>
                      <h2>Find Candidates</h2>
                    </div>

                    <button
                      className="text-button"
                      onClick={resetFilters}
                    >
                      Reset
                    </button>
                  </div>

                  <div className="filter-form">

                    <label>
                      Skills

                      <select
                        value={skill}
                        onChange={(e) => setSkill(e.target.value)}
                      >
                        <option>All skills</option>
                        <option>JavaScript</option>
                        <option>React</option>
                        <option>Node.js</option>
                      </select>
                    </label>

                    <label>
                      Minimum Score

                      <select
                        value={minimumScore}
                        onChange={(e) => setMinimumScore(e.target.value)}
                      >
                        <option>Any score</option>
                        <option>70+</option>
                        <option>80+</option>
                        <option>90+</option>
                      </select>
                    </label>

                    <label>
                      Verification

                      <select
                        value={verification}
                        onChange={(e) => setVerification(e.target.value)}
                      >
                        <option>All candidates</option>
                        <option>Verified only</option>
                      </select>
                    </label>

                    <button
                      className="apply-button"
                      type="button"
                    >
                      Apply Filters
                    </button>

                  </div>

                </div>

              </div>

            </section>

            {/* BOTTOM */}

            <section className="bottom-grid">

              <div className="dashboard-card">

                <div className="card-header">

                  <h2>
                    Recent Activity
                  </h2>

                  <button className="text-button">
                    View all →
                  </button>

                </div>

                <div className="activity-list">

                  {invitations.length === 0 ? (
                    <>
                      <div className="activity-item">

                        <span>✉</span>

                        <div>
                          <strong>
                            No invitations yet
                          </strong>

                          <small>
                            Invite candidates from
                            the candidate list
                          </small>
                        </div>

                      </div>

                      <div className="activity-item">

                        <span>□</span>

                        <div>
                          <strong>
                            No challenges posted
                          </strong>

                          <small>
                            Create your first company
                            challenge
                          </small>
                        </div>

                      </div>
                    </>
                  ) : (
                    invitations
                      .slice(0, 5)
                      .map((invitation) => (
                        <div
                          className="activity-item"
                          key={invitation._id}
                        >

                          <span>✉</span>

                          <div>

                            <strong>
                              Invitation sent to{" "}
                              {invitation.candidate
                                ?.name ||
                                invitation.candidateEmail}
                            </strong>

                            <small>
                              {invitation.position} •{" "}
                              {invitation.status}
                            </small>

                          </div>

                        </div>
                      ))
                  )}

                </div>

              </div>

              <div className="dashboard-card">

                <div className="card-header">

                  <h2>
                    My Challenges
                  </h2>

                  <button className="text-button">
                    View all →
                  </button>

                </div>

                <div className="empty-challenges">

                  <div>□</div>

                  <strong>
                    No challenges yet
                  </strong>

                  <p>
                    Post your first challenge
                    to start evaluating
                    developers.
                  </p>

                  <button
                    className="secondary-button"
                    type="button"
                  >
                    + Post Challenge
                  </button>

                </div>

              </div>

            </section>
          </>
        )}

        {/* CONTENT GRID - INVITATIONS TAB */}

        {activeTab === "invitations" && (
          <section className="dashboard-grid" style={{ gridTemplateColumns: "1fr" }}>

            <div className="dashboard-card" style={{ width: "100%" }}>

              <div className="card-header" style={{ marginBottom: "20px", borderBottom: "1px solid #e7e9f0", paddingBottom: "16px" }}>

                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 6px 0", color: "#171923" }}>
                    Sent Company Invitations
                  </h2>

                  <p style={{ color: "#717d96", fontSize: "14px", margin: 0 }}>
                    Track all candidate invitations and monitor live responses.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => changeTab("dashboard")}
                  style={{ cursor: "pointer" }}
                >
                  ← Back to Dashboard
                </button>

              </div>

              {invitationLoading ? (
                <div style={{ textAlign: "center", padding: "50px", color: "#717d96" }}>
                  Loading invitations...
                </div>
              ) : invitations.length === 0 ? (
                <div className="empty-challenges" style={{ padding: "50px 20px" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>✉</div>

                  <strong>No Invitations Sent Yet</strong>

                  <p style={{ color: "#717d96", maxWidth: "420px", margin: "8px auto 16px" }}>
                    Search candidates on your dashboard and click the 3 dots action menu to send invitations.
                  </p>

                  <button
                    className="post-button"
                    onClick={() => changeTab("dashboard")}
                  >
                    Find Candidates
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #edf2f7", textAlign: "left" }}>
                        <th style={{ padding: "14px 16px", color: "#717d96", fontSize: "13px" }}>Candidate</th>
                        <th style={{ padding: "14px 16px", color: "#717d96", fontSize: "13px" }}>Position</th>
                        <th style={{ padding: "14px 16px", color: "#717d96", fontSize: "13px" }}>Message</th>
                        <th style={{ padding: "14px 16px", color: "#717d96", fontSize: "13px" }}>Date Sent</th>
                        <th style={{ padding: "14px 16px", color: "#717d96", fontSize: "13px" }}>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {invitations.map((inv) => {
                        const candidateName =
                          inv.candidate?.name ||
                          inv.candidateEmail ||
                          "Candidate";

                        const candidateInitial =
                          candidateName.charAt(0).toUpperCase();

                        const sentDate = new Date(
                          inv.createdAt
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });

                        return (
                          <tr
                            key={inv._id}
                            style={{ borderBottom: "1px solid #edf2f7" }}
                          >
                            <td style={{ padding: "16px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "50%",
                                    background: "#e0f2fe",
                                    color: "#0369a1",
                                    fontWeight: "700",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "15px",
                                  }}
                                >
                                  {candidateInitial}
                                </div>

                                <div>
                                  <strong
                                    style={{
                                      display: "block",
                                      color: "#2d3748",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {candidateName}
                                  </strong>

                                  <small
                                    style={{
                                      color: "#717d96",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {inv.candidateEmail}
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td
                              style={{
                                padding: "16px",
                                color: "#2d3748",
                                fontWeight: "600",
                                fontSize: "14px",
                              }}
                            >
                              {inv.position}
                            </td>

                            <td
                              style={{
                                padding: "16px",
                                color: "#4a5568",
                                fontSize: "13px",
                                maxWidth: "260px",
                              }}
                            >
                              {inv.message ? (
                                `"${inv.message}"`
                              ) : (
                                <span style={{ color: "#a0aec0" }}>
                                  No message
                                </span>
                              )}
                            </td>

                            <td
                              style={{
                                padding: "16px",
                                color: "#717d96",
                                fontSize: "13px",
                              }}
                            >
                              {sentDate}
                            </td>

                            <td style={{ padding: "16px" }}>
                              {inv.status === "accepted" ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 14px",
                                    borderRadius: "16px",
                                    backgroundColor: "#dcfce7",
                                    color: "#15803d",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                  }}
                                >
                                  ✓ Accepted
                                </span>
                              ) : inv.status === "declined" ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 14px",
                                    borderRadius: "16px",
                                    backgroundColor: "#fee2e2",
                                    color: "#b91c1c",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                  }}
                                >
                                  ✗ Declined
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 14px",
                                    borderRadius: "16px",
                                    backgroundColor: "#fef3c7",
                                    color: "#b45309",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                  }}
                                >
                                  ⏳ Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </section>
        )}


      </main>

      {/* --------------------------------------------------
          INVITATION MODAL
      -------------------------------------------------- */}

      {showInviteModal && selectedCandidate && (
        <div
          className="invite-modal-overlay"
          onClick={closeInviteModal}
        >

          <div
            className="invite-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="invite-modal-header">

              <div>
                <h2>
                  Invite Candidate
                </h2>

                <p>
                  Send an invitation to{" "}
                  <strong>
                    {selectedCandidate.username ||
                      "Developer"}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                className="invite-close-button"
                onClick={closeInviteModal}
                disabled={inviteSending}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={sendInvitation}
              className="invite-form"
            >

              <div className="invite-candidate-preview">

                <div className="candidate-avatar">
                  {(
                    selectedCandidate.username ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <strong>
                    {selectedCandidate.username ||
                      "Developer"}
                  </strong>

                  <small>
                    Sandbox candidate
                  </small>

                </div>

              </div>

              <label>
                Position

                <input
                  type="text"
                  placeholder="e.g. Frontend Developer Intern"
                  value={position}
                  onChange={(e) =>
                    setPosition(
                      e.target.value
                    )
                  }
                  disabled={inviteSending}
                  required
                />
              </label>

              <label>
                Message
                <span
                  style={{
                    fontWeight: "normal",
                    color: "#9aa0ae",
                  }}
                >
                  {" "}
                  (optional)
                </span>

                <textarea
                  placeholder="Write a message for the candidate..."
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  disabled={inviteSending}
                  rows="5"
                />
              </label>

              <div
                style={{
                  padding: "12px 14px",
                  background: "#f5f7fb",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#5f6675",
                }}
              >
                📧 The invitation will be sent to
                the candidate's registered Sandbox
                email address.
              </div>

              {inviteError && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  {inviteError}
                </div>
              )}

              {inviteMessage && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#f0fdf4",
                    color: "#16a34a",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  {inviteMessage}
                </div>
              )}

              <div className="invite-form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeInviteModal}
                  disabled={inviteSending}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="post-button"
                  disabled={inviteSending}
                >
                  {inviteSending
                    ? "Sending..."
                    : "✉ Send Invitation"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default CompanyDashboard;