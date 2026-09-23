import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";


import CompanyDashboard from "./pages/CompanyDashboard";
import ChallengeWorkspace from "./pages/ChallengeWorkspace";
import ChallengeCatalog from "./pages/ChallengeCatalog";
import Leaderboard from "./pages/Leaderboard";
import PracticedChallenges from "./pages/PracticedChallenges";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CompanySignup from "./pages/CompanySignup";
import Profile from "./pages/Profile";
import StudentInvitations from "./pages/StudentInvitations";
import EmailVerification from "./pages/EmailVerification";
import Instructions from "./pages/Instructions";
import { useBlockAIOverlays } from "./utils/aiOverlayBlocker";
import {
  challengeIdFromPath,
  pageFromPath,
  routes,
} from "./app/routes";

function App() {
  // This hook already existed in utils/aiOverlayBlocker.js but was never
  // actually called anywhere, so it did nothing. Mounting it here runs it
  // on every page (including the company dashboard), which is what
  // watches for/removes injected ChatGPT/Gemini/Copilot/etc. overlay UI.
  useBlockAIOverlays();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [verificationData, setVerificationData] = useState(null);
  const [assessmentReady, setAssessmentReady] = useState(false);
  const [page, setPage] = useState(() => {
    const routedPage = pageFromPath(window.location.pathname);
    if (routedPage !== "login") return routedPage;

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

  const [selectedChallenge, setSelectedChallenge] = useState(() => {
    const challengeId = challengeIdFromPath(window.location.pathname);
    return challengeId ? { challengeId } : null;
  });

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });
  useEffect(() => {
    setPage(pageFromPath(location.pathname));
    const challengeId = challengeIdFromPath(location.pathname);
    setSelectedChallenge(challengeId ? { challengeId } : null);
  }, [location.pathname]);

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
    const pathByPage = {
      challenge: routes.challenge,
      catalog: routes.catalog,
      leaderboard: routes.leaderboard,
      practiced: routes.practiced,
      invitations: routes.invitations,
      profile: routes.profile,
      company: routes.company,
      login: routes.login,
      signup: routes.signup,
      "company-signup": routes.companySignup,
      "email-verification": routes.verification,
      instructions: routes.instructions,
    };

    setSelectedChallenge(null);
    setMenuOpen(false);
    navigate(pathByPage[newPage] || routes.login);
  }

  /* LOGIN */

function handleLogin() {
  const savedUser =
    localStorage.getItem("user");

  if (savedUser) {
    const loggedInUser =
      JSON.parse(savedUser);

      if (loggedInUser.role === "company") {
        navigate(routes.company);
      }
    setUser(loggedInUser);
    setSelectedChallenge(null);
    setMenuOpen(false);

    const nextPage =
      loggedInUser.role === "company"
        ? "company"
        : "challenge";

    navigate(nextPage === "company" ? routes.company : routes.challenge);

    return;
  }

  navigate(routes.challenge);
}

  /* PRACTICE AGAIN */

function handlePractice(challengeId) {
  const selected = {
    challengeId: String(challengeId),
  };

  setSelectedChallenge(selected);
  setMenuOpen(false);
  navigate(`${routes.challenge}/${selected.challengeId}`);
}

  /* LOGOUT */

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setSelectedChallenge(null);
    setAssessmentReady(false);
    setMenuOpen(false);

    navigate(routes.login);
  }

  return (
    <>
      {/* ================= LOGIN ================= */}

      {page === "login" && (
        <Login
          onSignup={() => changePage("signup")}
          onCompanySignup={() => changePage("company-signup")}
          onLogin={handleLogin}
        />
      )}

      {/* ================= SIGNUP ================= */}

      {page === "signup" && (
        <Signup
          onLogin={handleLogin}
          onSignIn={() => changePage("login")}
          onRequireVerification={(data) => {
            setVerificationData(data);
            changePage("email-verification");
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
          onBack={() => changePage("signup")}
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

            changePage("company");
          }}
        />
      )}

      {/* ================= INSTRUCTIONS ================= */}

      {page === "instructions" && (
        <Instructions
          onProceed={() => {
            setAssessmentReady(true);
            changePage("challenge");
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
  changePage("challenge")
}
        />
      )}

      {/* ================= MAIN APP ================= */}

      {page !== "login" &&
        page !== "signup" &&
        page !== "email-verification" &&
        page !== "company-signup" &&
        page !== "company" &&
        page !== "instructions" &&
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
                        changePage("catalog")
                      }
                    >
                      Browse Categories
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
                setSelectedChallenge={setSelectedChallenge}
                onStartAssessment={() => {
                  setAssessmentReady(false);
                  changePage("instructions");
                }}
                assessmentReady={assessmentReady}
              />
            )}

            {page === "catalog" && (
              <ChallengeCatalog onPractice={handlePractice} />
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