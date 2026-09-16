import { useEffect, useState, useRef } from "react";
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
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenShared, setIsScreenShared] = useState(false);
  const screenSharedRef = useRef(false); // sync ref for render-cycle safe checks
  const [webcamStream, setWebcamStream] = useState(null);
  const [isWebcamShared, setIsWebcamShared] = useState(false);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);

  useEffect(() => {
    setChallenge(null);
    setSelectedFile("");
    setResult(null);
    setIsRunning(false);
    setIsNavigating(false);
    setIsSwapped(false);
  }, [challengeId]);
const checkActiveAssessment = async (targetChallengeId = null) => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      setCheckingAssessment(false);
      return false;
    }

    let url = `${API_URL}/api/assessment/active`;
    const idToCheck = targetChallengeId || challengeId;
    if (idToCheck) {
      url += `?challengeId=${idToCheck}`;
    }

    const response = await fetch(
      url,
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
      if (!targetChallengeId) setAssessmentAlreadyActive(true);
      return true;
    }
    
    if (targetChallengeId) {
      setAssessmentSession(null);
      setIntegrityScore(100);
      setProctoringActive(false);
      setIsSwapped(false);
    }
    return false;
  } catch (error) {
    console.error("Failed to check active assessment:", error);
    return false;
  } finally {
    if (!targetChallengeId) setCheckingAssessment(false);
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
      if (data.lockedUntil) {
        setAssessmentSession(prev => prev ? { ...prev, lockedUntil: data.lockedUntil } : prev);
      }
    } catch (error) {
      console.error("Integrity event error:", error);
    }
  };

  async function startAssessmentSession(targetId = null) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("You are not logged in");

    const body = {};
    const idToStart = targetId && typeof targetId === "string" ? targetId : challengeId;
    if (idToStart) body.challengeId = idToStart;

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

    const savedCodeStr = localStorage.getItem(`challenge_code_${revealedChallenge.challengeId}`);
    if (savedCodeStr) {
      try {
        const savedCode = JSON.parse(savedCodeStr);
        revealedChallenge.files = { ...revealedChallenge.files, ...savedCode };
      } catch (e) {
        console.error("Failed to parse saved code", e);
      }
    }

    if (!revealedChallenge?.files) {
      throw new Error("Invalid challenge data received");
    }

    setChallenge(revealedChallenge);
    const firstFile = Object.keys(revealedChallenge.files)[0];
    setSelectedFile(firstFile || "");
    setResult(null);

    return revealedChallenge;
  }

  async function requestScreenShare() {
    if (isScreenShared && screenStream) return true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      if (settings.displaySurface && settings.displaySurface !== "monitor") {
        videoTrack.stop();
        setResult({
          passed: false,
          message: "You must share your Entire Screen to proceed. Sharing a single tab or window is not allowed.",
        });
        return false;
      }
      
      videoTrack.onended = () => {
        setIsScreenShared(false);
        screenSharedRef.current = false;
        setScreenStream(null);
        reportIntegrityEvent("screen_share_stopped", { reason: "user_stopped" });
      };

      videoTrack.onmute = () => {
        setIsScreenShared(false);
        screenSharedRef.current = false;
        reportIntegrityEvent("screen_share_stopped", { reason: "hardware_mute" });
      };

      setScreenStream(stream);
      setIsScreenShared(true);
      screenSharedRef.current = true;
      return true;
    } catch (error) {
      console.error("Screen sharing failed:", error);
      return false;
    }
  }

  async function requestWebcam() {
    if (isWebcamShared && webcamStream) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      
      videoTrack.onended = () => {
        setIsWebcamShared(false);
        setWebcamStream(null);
        reportIntegrityEvent("webcam_stopped", { reason: "user_stopped" });
      };

      videoTrack.onmute = () => {
        setIsWebcamShared(false);
        reportIntegrityEvent("webcam_stopped", { reason: "hardware_mute" });
      };

      setWebcamStream(stream);
      setIsWebcamShared(true);
      return true;
    } catch (error) {
      console.error("Webcam access failed:", error);
      return false;
    }
  }

  async function handleStartProctoring(targetId = null) {
    try {
      setResult(null);

      const screenShared = await requestScreenShare();
      if (!screenShared) {
        setResult({
          passed: false,
          message: "Screen sharing is required to start the assessment.",
        });
        return;
      }

      const webcamShared = await requestWebcam();
      if (!webcamShared) {
        setResult({
          passed: false,
          message: "Webcam access is required to start the assessment.",
        });
        return;
      }

      const session = await startAssessmentSession(targetId);
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
      if (document.hidden) {
        reportIntegrityEvent("tab_switch");
        setShowTabSwitchWarning(true);
      }
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

    // const handleKeyDown = (e) => {
    //   const key = e.key.toLowerCase();
    //   if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(key)) {
    //     e.preventDefault();
    //     reportIntegrityEvent("shortcut", { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
    //   }
    // };
    const handleKeyDown = () => {};

    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("cut", handleCut, true);
    // document.addEventListener("contextmenu", handleContextMenu);
    // document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("cut", handleCut, true);
      // document.removeEventListener("contextmenu", handleContextMenu);
      // document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [proctoringActive, assessmentSession?.id]);

  function handleCodeChange(newCode) {
    setChallenge((previous) => {
      if (!previous) return previous;
      const updatedFiles = { ...previous.files, [selectedFile]: newCode || "" };
      localStorage.setItem(`challenge_code_${previous.challengeId}`, JSON.stringify(updatedFiles));
      return {
        ...previous,
        files: updatedFiles,
      };
    });
  }

  function handleResetCode() {
    if (!challenge) return;
    if (window.confirm("Are you sure you want to reset your code to the original state? This cannot be undone.")) {
      localStorage.removeItem(`challenge_code_${challenge.challengeId}`);
      loadChallenge("current");
    }
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

      const savedCodeStr = localStorage.getItem(`challenge_code_${nextChallenge.challengeId}`);
      if (savedCodeStr) {
        try {
          const savedCode = JSON.parse(savedCodeStr);
          nextChallenge.files = { ...nextChallenge.files, ...savedCode };
        } catch (e) {
          console.error("Failed to parse saved code", e);
        }
      }

      setChallenge(nextChallenge);
      const firstFile = Object.keys(nextChallenge.files || {})[0];
      setSelectedFile(firstFile || "");
      setResult(null);
      
      const wasProctoring = proctoringActive;
      const hasActive = await checkActiveAssessment(nextChallenge.challengeId);
      if (hasActive) {
        setProctoringActive(true);
      } else {
        if (wasProctoring) {
          handleStartProctoring(nextChallenge.challengeId);
        } else {
          setProctoringActive(false);
          setIsSwapped(false);
        }
      }
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
setIsScreenShared(false);
if (screenStream) {
  screenStream.getTracks().forEach(track => track.stop());
  setScreenStream(null);
}
setIsWebcamShared(false);
if (webcamStream) {
  webcamStream.getTracks().forEach(track => track.stop());
  setWebcamStream(null);
}

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
              const screenShared = await requestScreenShare();
              if (!screenShared) return;

              const webcamShared = await requestWebcam();
              if (!webcamShared) return;

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

if (proctoringActive && !isScreenShared && !screenSharedRef.current) {
  return (
    <div className="badge-screen-container">
      <div className="assessment-active-card" style={{ borderColor: "#ef4444" }}>
        <div className="assessment-active-icon" style={{ color: "#ef4444" }}>
          🚫
        </div>
        <h2>Screen Sharing Stopped</h2>
        <p>You must share your screen to continue the assessment. Stopping your screen share negatively impacts your integrity score.</p>
        <button
          className="badge-start-btn"
          style={{ backgroundColor: "#ef4444" }}
          onClick={async () => {
            const shared = await requestScreenShare();
            // Once shared, it will naturally flip back to the workspace.
          }}
        >
          Resume Screen Share
        </button>
      </div>
    </div>
  );
}

if (proctoringActive && !isWebcamShared) {
  return (
    <div className="badge-screen-container">
      <div className="assessment-active-card" style={{ borderColor: "#ef4444" }}>
        <div className="assessment-active-icon" style={{ color: "#ef4444" }}>
          📷
        </div>
        <h2>Webcam Stopped</h2>
        <p>You must share your webcam to continue the assessment. Stopping your webcam negatively impacts your integrity score.</p>
        <button
          className="badge-start-btn"
          style={{ backgroundColor: "#ef4444" }}
          onClick={async () => {
            await requestWebcam();
          }}
        >
          Resume Webcam
        </button>
      </div>
    </div>
  );
}

if (proctoringActive && showTabSwitchWarning) {
  return (
    <div className="badge-screen-container">
      <div className="assessment-active-card" style={{ borderColor: "#ef4444" }}>
        <div className="assessment-active-icon" style={{ color: "#ef4444" }}>
          ⚠️
        </div>
        <h2>Tab Switch Detected</h2>
        <p>You have switched tabs or minimized the window. This is a violation of the assessment rules and points have been deducted from your integrity score.</p>
        <button
          className="badge-start-btn"
          style={{ backgroundColor: "#ef4444" }}
          onClick={() => setShowTabSwitchWarning(false)}
        >
          I Understand
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
                backgroundColor: integrityScore > 85 ? "rgba(16, 185, 129, 0.1)" : integrityScore > 75 ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: integrityScore > 85 ? "#10b981" : integrityScore > 75 ? "#f59e0b" : "#ef4444",
                padding: "6px 12px",
                borderRadius: "20px",
                fontWeight: "600",
                fontSize: "14px",
                border: `1px solid ${integrityScore > 85 ? "rgba(16, 185, 129, 0.2)" : integrityScore > 75 ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
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

          <button
            className="nav-button"
            onClick={handleResetCode}
            disabled={!proctoringActive || isRunning || isNavigating}
            style={{ marginLeft: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none' }}
          >
            ↺ Reset
          </button>

        </div>
      </header>

      {isLockedOut ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "white", backgroundColor: "#0f172a", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <h1 style={{ color: "#ff4d4d", fontSize: "3rem", marginBottom: "1rem" }}>Question Locked</h1>
          <p style={{ fontSize: "1.2rem", maxWidth: "600px", lineHeight: "1.6" }}>
            You have been locked out of this specific question for 1 hour due to multiple prohibited actions. You may navigate to other questions using the top bar.
          </p>
          <p style={{ marginTop: "2rem", color: "#94a3b8" }}>
            Lock expires: {new Date(assessmentSession.lockedUntil).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="workspace-main">
          <div className="workspace-content">
            <div className="sidebar">
              <FileExplorer
                key={challenge.challengeId}
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
          </div>   {/* workspace-main */}
      )}
    </div>
  );
}

export default ChallengeWorkspace;