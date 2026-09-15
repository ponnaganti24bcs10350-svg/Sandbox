import "./Profile.css";

function Profile({ user, onBack }) {
  const totalSolved =
    user?.progress?.totalSolved || 0;

  const javascriptScore =
    user?.javascriptScore || 0;

  const reactScore =
    user?.reactScore || 0;

  const engineeringScore = Math.round(
    (javascriptScore + reactScore) / 2
  );

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
          {(user?.name || "U")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="profile-identity">
          <h1>
            {user?.name || "Developer"}
          </h1>

          <p>
            {user?.email || ""}
          </p>

          <span className="profile-role">
            Developer
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
          <span>Engineering Score</span>

          <strong>
            {engineeringScore}
          </strong>

          <small>
            Based on demonstrated skills
          </small>
        </div>

        <div className="profile-stat">
          <span>Challenges Solved</span>

          <strong>
            {totalSolved}
          </strong>

          <small>
            Total successful challenges
          </small>
        </div>

        <div className="profile-stat">
          <span>Current Streak</span>

          <strong>0</strong>

          <small>
            Days
          </small>
        </div>

        <div className="profile-stat">
          <span>Verification</span>

          <strong className="not-verified">
            Not verified
          </strong>

          <small>
            Complete verification later
          </small>
        </div>

      </section>

      {/* SKILLS */}

      <section className="profile-section">

        <div className="profile-section-heading">
          <div>
            <h2>Skills</h2>

            <p>
              Your demonstrated engineering abilities
            </p>
          </div>
        </div>

        <div className="skills-grid">

          {/* JAVASCRIPT */}

          <div className="skill-card">

            <div className="skill-card-top">
              <strong>JavaScript</strong>

              <span>
                {javascriptScore}
              </span>
            </div>

            <div className="skill-bar">
              <div
                style={{
                  width: `${javascriptScore}%`,
                }}
              />
            </div>

            <small>
              {javascriptScore > 0
                ? "Based on completed challenges"
                : "Not enough data yet"}
            </small>

          </div>

          {/* REACT */}

          <div className="skill-card">

            <div className="skill-card-top">
              <strong>React</strong>

              <span>
                {reactScore}
              </span>
            </div>

            <div className="skill-bar">
              <div
                style={{
                  width: `${reactScore}%`,
                }}
              />
            </div>

            <small>
              {reactScore > 0
                ? "Based on completed challenges"
                : "Not enough data yet"}
            </small>

          </div>

          {/* FRONTEND */}

          <div className="skill-card">

            <div className="skill-card-top">
              <strong>Frontend</strong>

              <span>—</span>
            </div>

            <div className="skill-bar">
              <div
                style={{
                  width: "0%",
                }}
              />
            </div>

            <small>
              More skill data required
            </small>

          </div>

          {/* BACKEND */}

          <div className="skill-card">

            <div className="skill-card-top">
              <strong>Backend</strong>

              <span>—</span>
            </div>

            <div className="skill-bar">
              <div
                style={{
                  width: "0%",
                }}
              />
            </div>

            <small>
              More skill data required
            </small>

          </div>

        </div>

      </section>

      {/* RECENT ACTIVITY */}

      <section className="profile-section">

        <div className="profile-section-heading">
          <div>

            <h2>Recent Challenges</h2>

            <p>
              Your latest engineering activity
            </p>

          </div>
        </div>

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

      </section>

    </div>
  );
}

export default Profile;