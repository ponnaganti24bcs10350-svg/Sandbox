import { useEffect, useState } from "react";
import { getApiUrl } from "../config/api";
import "./Profile.css";

function Profile({ user, onBack }) {
  const [profileUser, setProfileUser] = useState(user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setProfileUser(user);
          return;
        }

        const response = await fetch(
          `${getApiUrl()}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();
        console.log("PROFILE API USER:", result.user);

        if (response.ok && result.success) {
          setProfileUser(result.user);
        } else {
          setProfileUser(user);
        }
      } catch (error) {
        console.error(
          "Failed to load profile:",
          error
        );

        setProfileUser(user);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const currentUser = profileUser || user;

  const totalSolved = Number(
    currentUser?.progress?.totalSolved || 0
  );

  const backendScore = Number(
    currentUser?.backendScore || 0
  );

  const hasBackendData =
    backendScore > 0;

  const currentStreak = Number(
    currentUser?.progress?.currentStreak ??
    currentUser?.currentStreak ??
    0
  );

  const isVerified =
    currentUser?.verified === true ||
    currentUser?.isVerified === true ||
    currentUser?.emailVerified === true;

  const recentChallenges =
    Array.isArray(currentUser?.recentChallenges)
      ? currentUser.recentChallenges
      : [];

  const initials = (
    currentUser?.name ||
    "Developer"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="profile-page">

      {/* TOPBAR */}

      <div className="profile-topbar">
        <button
          className="profile-back"
          onClick={onBack}
        >
          ← Back
        </button>

        <span className="profile-title">
          Developer Profile
        </span>
      </div>

      {/* PROFILE HEADER */}

      <section className="profile-header-card">

        <div className="profile-avatar">
          {initials}
        </div>

        <div className="profile-identity">
          <h1>
            {currentUser?.name || "Developer"}
          </h1>

          <p>
            {currentUser?.email ||
              "No email available"}
          </p>

          <span className="profile-role">
            {currentUser?.role === "company"
              ? "Company"
              : "Developer"}
          </span>
        </div>

        <button
          type="button"
          className="edit-profile-button"
        >
          Edit Profile
        </button>

      </section>

      {/* OVERVIEW */}

      <section className="profile-stats">

        <div className="profile-stat">
          <span>
            Challenges Solved
          </span>

          <strong>
            {totalSolved}
          </strong>

          <small>
            Total successful challenges
          </small>
        </div>

        <div className="profile-stat">
          <span>
            Current Streak
          </span>

          <strong>
            {currentStreak}
          </strong>

          <small>
            Days
          </small>
        </div>

        <div className="profile-stat">
          <span>
            Verification
          </span>

          <strong
            className={
              isVerified
                ? "verified"
                : "not-verified"
            }
          >
            {isVerified
              ? "Verified"
              : "Not verified"}
          </strong>

          <small>
            {isVerified
              ? "Account verified"
              : "Complete verification later"}
          </small>
        </div>

      </section>

      {/* SKILLS */}

      <section className="profile-section">

        <div className="profile-section-heading">
          <div>
            <h2>
              Skills
            </h2>

            <p>
              Your demonstrated engineering abilities
            </p>
          </div>
        </div>

        <div className="skills-grid">

          <div className="skill-card">

            <div className="skill-card-top">
              <strong>
                Backend
              </strong>

              <span>
                {hasBackendData
                  ? `${backendScore}%`
                  : "—"}
              </span>
            </div>

            <div className="skill-bar">
              <div
                style={{
                  width: `${Math.min(
                    backendScore,
                    100
                  )}%`,
                }}
              />
            </div>

            <small>
              {hasBackendData
                ? "Based on demonstrated backend skills"
                : "More skill data required"}
            </small>

          </div>

        </div>

      </section>

      {/* RECENT ACTIVITY */}

      <section className="profile-section">

        <div className="profile-section-heading">
          <div>

            <h2>
              Recent Challenges
            </h2>

            <p>
              Your latest engineering activity
            </p>

          </div>
        </div>

        {recentChallenges.length > 0 ? (
          <div className="profile-recent-list">
            {recentChallenges.map(
              (challenge, index) => (
                <div
                  className="profile-recent-item"
                  key={
                    challenge?._id ||
                    challenge?.id ||
                    index
                  }
                >
                  <strong>
                    {challenge?.title ||
                      challenge?.name ||
                      "Challenge"}
                  </strong>

                  <span>
                    {challenge?.status ||
                      "Completed"}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="profile-empty">

            <div className="profile-empty-icon">
              ✓
            </div>

            <strong>
              No challenges yet
            </strong>

            <p>
              Solve challenges to start building
              your engineering profile.
            </p>

          </div>
        )}

      </section>

    </div>
  );
}

export default Profile;