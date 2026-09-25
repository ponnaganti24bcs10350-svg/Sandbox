import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../config/api";
import "./Leaderboard.css";

function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setError("");

        const response = await fetch(
          `${getApiUrl()}/api/leaderboard`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to fetch leaderboard"
          );
        }

        setUsers(result.data || []);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);

        setError(
          error.message || "Unable to connect to server"
        );
      }
    }

    fetchLeaderboard();
  }, []);

  const currentUserId = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        return null;
      }

      const user = JSON.parse(storedUser);

      return user?._id || user?.id || user?.userId || null;
    } catch {
      return null;
    }
  }, []);

  const currentUser = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return (
      users.find(
        (user) =>
          String(user.userId) === String(currentUserId)
      ) || null
    );
  }, [users, currentUserId]);

  const totalDevelopers = users.length;

  function getRankDisplay(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";

    return `#${rank}`;
  }

  function getInitials(username = "") {
    const parts = username.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return username.slice(0, 2).toUpperCase();
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">

        <div className="leaderboard-heading">
          <span className="leaderboard-eyebrow">
            LEADERBOARD
          </span>

          <h1 className="leaderboard-title">
            Developer Leaderboard
          </h1>

          <p className="leaderboard-subtitle">
            Track your skills. Improve your rank.
          </p>
        </div>

        {error ? (
          <div className="leaderboard-error">
            <p>Unable to load leaderboard.</p>
            <p>{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="leaderboard-empty">
            <h2>No developers found yet.</h2>
            <p>
              Complete challenges to appear on the leaderboard.
            </p>
          </div>
        ) : (
          <>
            {/* STATS */}

            <section className="leaderboard-stats">

              <div className="leaderboard-stat">
                <div className="stat-icon">
                  ↗
                </div>

                <span className="stat-label">
                  YOUR RANK
                </span>

                <strong className="stat-value">
                  {currentUser
                    ? `#${currentUser.rank}`
                    : "—"}
                </strong>

                <span className="stat-description">
                  {currentUser
                    ? `out of ${totalDevelopers} developers`
                    : `${totalDevelopers} developers`}
                </span>
              </div>

              <div className="leaderboard-stat">
                <div className="stat-icon">
                  👥
                </div>

                <span className="stat-label">
                  TOTAL DEVELOPERS
                </span>

                <strong className="stat-value">
                  {totalDevelopers.toLocaleString()}
                </strong>

                <span className="stat-description">
                  on Sandbox
                </span>
              </div>

              <div className="leaderboard-stat">
                <div className="stat-icon">
                  ◎
                </div>

                <span className="stat-label">
                  YOUR SCORE
                </span>

                <strong className="stat-value">
                  {currentUser
                    ? `${currentUser.mernScore}%`
                    : "—"}
                </strong>

                <span className="stat-description">
                  MERN
                </span>
              </div>

            </section>

            {/* LEADERBOARD LIST */}

            <section className="leaderboard-list">

              {users.map((user) => {
                const isCurrentUser =
                  String(user.userId) ===
                  String(currentUserId);

                return (
                  <div
                    className={`leaderboard-card ${
                      isCurrentUser
                        ? "current-user"
                        : ""
                    }`}
                    key={user.userId}
                  >

                    <div
                      className={`rank ${
                        user.rank <= 3
                          ? `rank-${user.rank}`
                          : ""
                      }`}
                    >
                      {getRankDisplay(user.rank)}
                    </div>

                    <div className="avatar">
                      {getInitials(user.username)}
                    </div>

                    <div className="user-info">

                      <div className="user-main">
                        <h2 className="username">
                          {user.username}
                        </h2>

                        {isCurrentUser && (
                          <span className="you-badge">
                            YOU
                          </span>
                        )}
                      </div>

                      <span className="skill-tag">
                        MERN
                      </span>

                    </div>

                    <div className="score-section">

                      <div className="score-row">

                        <div className="progress-bar">
                          <div
                            className="progress"
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  Number(user.mernScore) || 0,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="score">
                          {user.mernScore}%
                        </span>

                      </div>

                    </div>

                    <div className="leaderboard-arrow">
                      →
                    </div>

                  </div>
                );
              })}

            </section>
          </>
        )}

      </div>
    </div>
  );
}

export default Leaderboard;