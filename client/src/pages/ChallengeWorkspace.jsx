import { useEffect, useState } from "react";
// Or if using Vite src imports: import badgeBg from "../assets/pexels-alipazani-2810836.jpg";
import FileExplorer from "../components/FileExplorer";
import CodeEditor from "../components/CodeEditor";
import TestResults from "../components/TestResults";
import { getApiUrl } from "../config/api";

const API_URL = getApiUrl();

function ChallengeWorkspace({ selectedChallenge }) {
  const challengeId = selectedChallenge?.challengeId || null;

  const [challenge, setChallenge] = useState(null);
  const [terminalHeight, setTerminalHeight] = useState(150);
  const [selectedFile, setSelectedFile] = useState("");
  const [assessmentSession, setAssessmentSession] = useState(null);
  const [proctoringActive, setProctoringActive] = useState(false);
  const [checkingAssessment, setCheckingAssessment] = useState(true);
const [assessmentAlreadyActive, setAssessmentAlreadyActive] = useState(false);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // State to handle physical card swapping animation
  const [isSwapped, setIsSwapped] = useState(false);

  useEffect(() => {
    setChallenge(null);
    setSelectedFile("");
    setResult(null);
    setIsRunning(false);
    setIsNavigating(false);
    setIsSwapped(false);
  }, [challengeId]);
const checkActiveAssessment = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      setCheckingAssessment(false);
      return;
    }

    const response = await fetch(
      `${API_URL}/api/assessment/active`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success && data.active) {
      setAssessmentSession(data.session);
      setIntegrityScore(data.session.integrityScore || 100);
      setAssessmentAlreadyActive(true);
    }
  } catch (error) {
    console.error("Failed to check active assessment:", error);
  } finally {
    setCheckingAssessment(false);
  }
};
useEffect(() => {
  const justLoggedIn = sessionStorage.getItem("justLoggedIn");
  const assessmentStarted =
    sessionStorage.getItem("assessmentStarted");

  // Fresh login → ALWAYS Start Assessment
  if (justLoggedIn === "true") {
    sessionStorage.removeItem("justLoggedIn");
    setCheckingAssessment(false);
    return;
  }

  // Resume ONLY if Start Proctoring
  // was previously clicked
  if (assessmentStarted === "true") {
    checkActiveAssessment();
    return;
  }

  // No assessment has been started
  setCheckingAssessment(false);
}, []);
useEffect(() => {
  if (!assessmentSession || assessmentSession.status !== "active") return;

  const handleBeforeUnload = (event) => {
    event.preventDefault();
    event.returnValue = "";
  };

  window.addEventListener(
    "beforeunload",
    handleBeforeUnload
  );

  return () => {
    window.removeEventListener(
      "beforeunload",
      handleBeforeUnload
    );
  };
}, [assessmentSession]);
  const reportIntegrityEvent = async (type, metadata = {}) => {
    if (!assessmentSession?.id) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/assessment/${assessmentSession.id}/integrity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type, metadata }),
        }
      );

      const data = await response.json();
      if (!response.ok) return;

      if (typeof data.integrityScore === "number") {
        setIntegrityScore(data.integrityScore);
      }
    } catch (error) {
      console.error("Integrity event error:", error);
    }
  };

  async function startAssessmentSession() {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("You are not logged in");

    const body = {};
    if (challengeId) body.challengeId = challengeId;

    const response = await fetch(`${API_URL}/api/assessment/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.status === 409 && data.session) {
      const existingSession = {
        id: data.session._id || data.session.id,
        startedAt: data.session.startedAt,
        integrityScore: data.session.integrityScore ?? 100,
        challengeId: data.session.challenge,
      };

      setAssessmentSession(existingSession);
      setIntegrityScore(existingSession.integrityScore);
      return existingSession;
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to start assessment");
    }

    const newSession = {
      ...data.session,
      challengeId: data.session.challengeId || data.session.challenge || challengeId,
    };

    setAssessmentSession(newSession);
    setIntegrityScore(newSession.integrityScore ?? 100);
    return newSession;
  }

  async function revealChallenge(session) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("You are not logged in");
    if (!session?.id) throw new Error("Assessment session is missing");

    const response = await fetch(
      `${API_URL}/api/assessment/${session.id}/challenge`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load challenge");
    }

    const revealedChallenge = data.data;

    if (!revealedChallenge?.files) {
      throw new Error("Invalid challenge data received");
    }

    setChallenge(revealedChallenge);
    const firstFile = Object.keys(revealedChallenge.files)[0];
    setSelectedFile(firstFile || "");
    setResult(null);

    return revealedChallenge;
  }

  async function handleStartProctoring() {
    try {
      setResult(null);
      const session = await startAssessmentSession();
      sessionStorage.setItem("assessmentStarted", "true");
      setProctoringActive(true);

      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (fullscreenError) {
          console.warn("Fullscreen could not be enabled:", fullscreenError);
        }
      }

      await revealChallenge(session);
    } catch (error) {
      console.error("Failed to start proctoring:", error);
      setProctoringActive(false);
      setResult({
        passed: false,
        message: error.message || "Failed to start assessment",
      });
    }
  }

  useEffect(() => {
    if (!proctoringActive || !assessmentSession?.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) reportIntegrityEvent("tab_switch");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [proctoringActive, assessmentSession?.id]);

  useEffect(() => {
    if (!proctoringActive || !assessmentSession?.id) return;

    const handleBlur = () => reportIntegrityEvent("window_blur");
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) reportIntegrityEvent("fullscreen_exit");
    };

    const handleCopy = (e) => { e.preventDefault(); reportIntegrityEvent("copy"); };
    const handlePaste = (e) => { e.preventDefault(); reportIntegrityEvent("paste"); };
    const handleCut = (e) => { e.preventDefault(); reportIntegrityEvent("cut"); };
    const handleContextMenu = (e) => { e.preventDefault(); reportIntegrityEvent("right_click"); };

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(key)) {
        e.preventDefault();
        reportIntegrityEvent("shortcut", { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [proctoringActive, assessmentSession?.id]);

  function handleCodeChange(newCode) {
    setChallenge((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        files: { ...previous.files, [selectedFile]: newCode || "" },
      };
    });
  }

  async function loadChallenge(direction) {
    if (isNavigating || isRunning || !challenge) return;

    try {
      setIsNavigating(true);
      setResult(null);

      const token = localStorage.getItem("token");
      if (!token) throw new Error("You are not logged in");

      const response = await fetch(
        `${API_URL}/api/progress/${direction}?challengeId=${encodeURIComponent(challenge.challengeId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to load ${direction} challenge`);
      }

      const nextChallenge = data.data;
      if (!nextChallenge) throw new Error("No challenge available");

      setChallenge(nextChallenge);
      const firstFile = Object.keys(nextChallenge.files || {})[0];
      setSelectedFile(firstFile || "");
      setResult(null);
    } catch (error) {
      console.error(`Failed to load ${direction} challenge:`, error);
      setResult({
        passed: false,
        message: error.message || `Failed to load ${direction} challenge`,
      });
    } finally {
      setIsNavigating(false);
    }
  }

  async function handleRun() {
    try {
      setIsRunning(true);
      setResult(null);

      const token = localStorage.getItem("token");
      if (!token) throw new Error("You are not logged in");
      if (!proctoringActive || !assessmentSession?.id) {
        throw new Error("Start Proctoring before running the challenge.");
      }
      if (!challenge) throw new Error("Challenge has not been loaded yet.");

      const response = await fetch(`${API_URL}/api/challenges/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          files: challenge.files,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to run challenge");

      setResult(data);

      if (data.passed && data.newlySolved) {
        const meResponse = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meResponse.json();
        if (meResponse.ok && meData.success) {
          localStorage.setItem("user", JSON.stringify(meData.user));
          window.dispatchEvent(new Event("userUpdated"));
        }
      }
    } catch (error) {
      setResult({
        passed: false,
        message: error.message || "Something went wrong while running the challenge.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmitAssessment() {
    if (!assessmentSession?.id) {
      setResult({
        passed: false,
        message: "Please start proctoring before submitting.",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You are not logged in");

      const response = await fetch(
        `${API_URL}/api/assessment/${assessmentSession.id}/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit assessment");
      }

      setAssessmentSession((previous) => ({
        ...previous,
        status: "submitted",
        submittedAt: data.assessment.submittedAt,
        integrityScore: data.assessment.integrityScore,
      }));

  setIntegrityScore(data.assessment.integrityScore);
setProctoringActive(false);

sessionStorage.removeItem("assessmentStarted");
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (error) {
          console.warn("Could not exit fullscreen:", error);
        }
      }

      setResult({
        passed: true,
        message: "Assessment submitted successfully.",
        
      });
    } catch (error) {
      setResult({
        passed: false,
        message: error.message || "Failed to submit assessment",
      });
    }
  }

  function getLanguage(fileName) {
    if (!fileName) return "plaintext";
    if (fileName.endsWith(".jsx") || fileName.endsWith(".js")) return "javascript";
    if (fileName.endsWith(".json")) return "json";
    if (fileName.endsWith(".css")) return "css";
    if (fileName.endsWith(".html")) return "html";
    return "plaintext";
  }

  function startResize(e) {
    e.preventDefault();
    function resize(event) {
      const newHeight = window.innerHeight - event.clientY;
      if (newHeight >= 70 && newHeight <= 500) setTerminalHeight(newHeight);
    }

    function stopResize() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
  }
  if (checkingAssessment) {
  return (
    <div className="badge-screen-container">
      <div className="assessment-loading">
        Checking assessment...
      </div>
    </div>
  );
}
if (assessmentAlreadyActive && !challenge) {
  return (
    <div className="badge-screen-container">
      
      <div className="assessment-active-card">

        <div className="assessment-active-icon">
          ⚠
        </div>

        <h2>Assessment Already Active</h2>

        <p>
          You are currently in an assessment.
          Reloading the page is not allowed.
        </p>

        <button
          className="badge-start-btn"
          onClick={async () => {
            try {
              await document.documentElement.requestFullscreen();

              const token = localStorage.getItem("token");

              const response = await fetch(
                `${API_URL}/api/assessment/${assessmentSession.id}/challenge`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              const data = await response.json();

              if (data.success) {
                setChallenge(data.data);
                setAssessmentAlreadyActive(false);
                setProctoringActive(true);
              }
            } catch (error) {
              console.error(
                "Failed to resume assessment:",
                error
              );
            }
          }}
        >
          Resume Assessment →
        </button>

      </div>

    </div>
  );
}

  /*
   * ------------------------------------
   * BADGE OVERLAY: TWO-CARD SWAP OVERLAY
   * ------------------------------------
   */
  if (!challenge) {
    return (
      <div className="badge-screen-container">
       {/* Background Blurred Ambient Image */}
<div
  className="bg-blurred-image"
  style={{
    backgroundImage: "url('/pexels-alipazani-2810836.jpg')"
  }}
/>
<div className="build-debug-prove">
  <span>BUILD.</span>
  <span>DEBUG.</span>
  <span>PROVE✓</span>
  
</div>
        <div className={`badge-wrapper ${isSwapped ? "is-swapped" : ""}`}>
          
          {/* CARD 1 (Front initially) */}
          <div className="badge-card card-1">
            <div className="badge-body">
              <div className="badge-text-content">
                <h2>Welcome to<br />Assessment ☺️</h2>
                <p>Click next to view proctoring requirements and begin your session.</p>
                {result && <p className="badge-error-msg">{result.message}</p>}
              </div>
            </div>
            <div className="badge-footer">
              <button
                className="badge-start-btn"
                onClick={() => setIsSwapped(true)}
              >
                Next →
              </button>
            </div>
          </div>

          {/* CARD 2 (Back/Red initially, shifts to front on click) */}
          <div className="badge-card card-2">
            <div className="badge-body">
              <div className="badge-text-content">
                <h2>Ready to Start<br />Assessment</h2>
                <p>Start Proctoring to reveal the assessment and code files.</p>
                {result && <p className="badge-error-msg">{result.message}</p>}
              </div>
            </div>
            <div className="badge-footer">
              <button
                className="badge-start-btn"
                onClick={handleStartProctoring}
                disabled={proctoringActive}
              >
                {proctoringActive ? "🛡 Proctoring On" : "🛡 Start Proctoring"}
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  /*
   * ------------------------------------
   * MAIN WORKSPACE
   * ------------------------------------
   */
  return (
    <div className="workspace">
      <header className="topbar">
        <div className="challenge-name">{challenge.title}</div>

        <div className="topbar-actions">
          <button
            className="nav-button"
            onClick={() => loadChallenge("previous")}
            disabled={isNavigating || isRunning}
          >
            ← Previous
          </button>

          <button
            className="nav-button"
            onClick={() => loadChallenge("next")}
            disabled={isNavigating || isRunning}
          >
            Next →
          </button>

          <button
            className="nav-button"
            onClick={handleStartProctoring}
            disabled={proctoringActive || isRunning || isNavigating}
          >
            {proctoringActive ? "🛡 Proctoring On" : "🛡 Start Proctoring"}
          </button>

          {proctoringActive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Integrity: {integrityScore}/100
            </div>
          )}

          <button
            className="run-button"
            onClick={handleRun}
            disabled={!proctoringActive || isRunning || isNavigating}
          >
            {isRunning ? "Running..." : "▶ Run"}
          </button>

         
        </div>
      </header>

      <div className="workspace-content">
        <div className="sidebar">
          <FileExplorer
            files={challenge.files}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </div>

        <div className="challenge-panel">
          <h2>{challenge.title}</h2>
          <h3>Problem</h3>
          <p>{challenge.description}</p>
          <h3>Requirements</h3>
          <ul>
            {challenge.requirements.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
        </div>

        <div className="editor-area">
          <h3>{selectedFile}</h3>
          <div className="editor-container">
            <CodeEditor
              code={challenge.files[selectedFile] || ""}
              onChange={handleCodeChange}
              language={getLanguage(selectedFile)}
            />
          </div>
        </div>
      </div>

      <div className="resize-handle" onMouseDown={startResize} />

      <div className="terminal-panel" style={{ height: `${terminalHeight}px` }}>
        <TestResults result={result} isRunning={isRunning} />
      </div>
    </div>
  );
}

export default ChallengeWorkspace;