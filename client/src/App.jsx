import { useEffect, useState } from "react";

import CompanyDashboard from "./pages/CompanyDashboard";
import ChallengeWorkspace from "./pages/ChallengeWorkspace";
import Leaderboard from "./pages/Leaderboard";
import PracticedChallenges from "./pages/PracticedChallenges";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CompanySignup from "./pages/CompanySignup";
import Profile from "./pages/Profile";
import StudentInvitations from "./pages/StudentInvitations";
import EmailVerification from "./pages/EmailVerification";


function App() {
  const [verificationData, setVerificationData] = useState(null);
  const [page, setPage] = useState(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return "login";
    }

    const savedUser =
      localStorage.getItem("user");

    if (savedUser) {
      const user = JSON.parse(savedUser);

      if (user.role === "company") {
        return "company";
      }
    }

    return "challenge";
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedChallenge, setSelectedChallenge] =
    useState(null);

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  /* KEEP USER PROGRESS UPDATED */

  useEffect(() => {
    function updateUser() {
      const savedUser =
        localStorage.getItem("user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }

    window.addEventListener(
      "userUpdated",
      updateUser
    );

    return () => {
      window.removeEventListener(
        "userUpdated",
        updateUser
      );
    };
  }, []);

  /* NAVIGATION */

  function changePage(newPage) {
    setPage(newPage);
    setMenuOpen(false);
  }

  /* LOGIN */

  function handleLogin() {
    const savedUser =
      localStorage.getItem("user");

    if (savedUser) {
      const loggedInUser =
        JSON.parse(savedUser);

      setUser(loggedInUser);
      setSelectedChallenge(null);
      setMenuOpen(false);

      if (loggedInUser.role === "company") {
        setPage("company");
      } else {
        setPage("challenge");
      }

      return;
    }

    setPage("challenge");
  }

  /* PRACTICE AGAIN */

  function handlePractice(challenge) {
    setSelectedChallenge(challenge);
    setMenuOpen(false);
    setPage("challenge");
  }

  /* LOGOUT */

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setSelectedChallenge(null);
    setMenuOpen(false);

    setPage("login");
  }

  return (
    <>
      {/* ================= LOGIN ================= */}

      {page === "login" && (
        <Login
          onSignup={() =>
            setPage("signup")
          }
          onCompanySignup={() =>
            setPage("company-signup")
          }
          onLogin={handleLogin}
        />
      )}

      {/* ================= SIGNUP ================= */}

      {page === "signup" && (
        <Signup
          onLogin={handleLogin}
          onSignIn={() => setPage("login")}
          onRequireVerification={(data) => {
            setVerificationData(data);
            setPage("email-verification");
          }}
        />
      )}

      {/* ================= EMAIL VERIFICATION ================= */}

      {page === "email-verification" && (
        <EmailVerification
          email={verificationData?.email}
          name={verificationData?.name}
          password={verificationData?.password}
          role={verificationData?.role || "student"}
          onVerified={() => handleLogin()}
          onBack={() => setPage("signup")}
        />
      )}

      {/* ================= COMPANY SIGNUP ================= */}

      {page === "company-signup" && (
        <CompanySignup
          onLogin={() => {
            const savedUser =
              localStorage.getItem("user");

            if (savedUser) {
              setUser(JSON.parse(savedUser));
            }

            setPage("company");
          }}
        />
      )}

      {/* ================= COMPANY DASHBOARD ================= */}

      {page === "company" && (
        <CompanyDashboard
          user={user}
          onLogout={handleLogout}
        />
      )}

      {/* ================= PROFILE ================= */}

      {page === "profile" && (
        <Profile
          user={user}
          onBack={() =>
            setPage("challenge")
          }
        />
      )}

      {/* ================= MAIN APP ================= */}

      {page !== "login" &&
        page !== "signup" &&
        page !== "email-verification" &&
        page !== "company-signup" &&
        page !== "company" &&
        page !== "profile" && (
          <>
            {/* ================= HEADER ================= */}

            <div className="app-header">

              <div className="sandbox-menu">

                <button
                  className="sandbox-button"
                  onClick={() =>
                    setMenuOpen(
                      (previous) => !previous
                    )
                  }
                >
                  SANDBOX
                </button>

                {/* DROPDOWN */}

                {menuOpen && (
                  <div className="dropdown-menu">

                    <button
                      onClick={() =>
                        changePage("challenge")
                      }
                    >
                      🧩 Challenges
                    </button>

                    <button
                      onClick={() =>
                        changePage("leaderboard")
                      }
                    >
                      🏆 Leaderboard
                    </button>

                    <button
                      onClick={() =>
                        changePage("practiced")
                      }
                    >
                      ✓ Practiced
                    </button>

                    <button
                      onClick={() =>
                        changePage("invitations")
                      }
                    >
                      📩 Invitations
                    </button>

                    <button
                      onClick={() =>
                        changePage("profile")
                      }
                    >
                      👤 Profile
                    </button>

                    <button
                      onClick={handleLogout}
                    >
                      Logout
                    </button>

                  </div>
                )}

              </div>

              {/* SOLVED COUNT */}

              {user?.progress && (
                <div className="user-progress">

                  <span className="solved-label">
                    Solved:
                  </span>

                  <span className="solved-count">
                    {user.progress.totalSolved}
                  </span>

                </div>
              )}

            </div>

            {/* ================= CHALLENGES ================= */}

            {page === "challenge" && (
              <ChallengeWorkspace
                selectedChallenge={
                  selectedChallenge
                }
              />
            )}

            {/* ================= LEADERBOARD ================= */}

            {page === "leaderboard" && (
              <Leaderboard />
            )}

            {/* ================= PRACTICED ================= */}

            {page === "practiced" && (
              <PracticedChallenges
                onPractice={handlePractice}
              />
            )}

            {/* ================= INVITATIONS ================= */}

            {page === "invitations" && (
              <StudentInvitations
                onBack={() => changePage("challenge")}
              />
            )}

          </>
        )}
    </>
  );
}

export default App;