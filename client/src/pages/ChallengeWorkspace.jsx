import { useEffect, useState, useRef, useCallback } from "react";
// Or if using Vite src imports: import badgeBg from "../assets/pexels-alipazani-2810836.jpg";
import FileExplorer from "../components/FileExplorer";
import CodeEditor from "../components/CodeEditor";
import TestResults from "../components/TestResults";
import { getApiUrl } from "../config/api";
import { useExamGuard, isDevToolsShortcut, isScreenshotShortcut, screenshotState } from "../utils/examGuard";

const API_URL = getApiUrl();

/*
 * "Is the app actually filling the screen?"
 *
 * document.fullscreenElement only knows about the Fullscreen API. If the
 * browser window is already in its OWN native full-screen (F11 on
 * Windows/Linux, the green dot on macOS, or a kiosk/TV browser), calling
 * requestFullscreen() is a silent no-op: no "fullscreenchange" event ever
 * fires and fullscreenElement stays null forever. That is why the "Resume
 * Fullscreen" button looked completely dead - the user WAS full-screen,
 * the app just refused to believe it, with no way forward.
 *
 * So we also compare the viewport against the physical screen. If the
 * window covers it, that counts as full-screen for the assessment.
 */
export function isEffectivelyFullscreen() {
  if (document.fullscreenElement) return true;

  if (typeof window === "undefined" || !window.screen) return false;

  const widthDiff = Math.abs(window.screen.width - window.innerWidth);
  const heightDiff = Math.abs(window.screen.height - window.innerHeight);

  // A normal window always loses at least the tab strip + address bar
  // (~60-120px). A few px of tolerance covers rounding/zoom.
  return widthDiff <= 5 && heightDiff <= 5;
}

function ChallengeWorkspace({
  selectedChallenge,
  setSelectedChallenge,
  onStartAssessment,
  assessmentReady = false,
}) {
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
  const [showMultiSessionWarning, setShowMultiSessionWarning] = useState(false);
  const tabTokenRef = useRef(null);
  const [isSwapped, setIsSwapped] = useState(false);
  const [panelWidth, setPanelWidth] = useState(280); // width of the challenge/question panel, resizable
  const [showResetConfirm, setShowResetConfirm] = useState(false); // custom modal, replaces window.confirm
  const [isFullscreen, setIsFullscreen] = useState(isEffectivelyFullscreen());
  // Shown when requestFullscreen() silently no-ops because the browser
  // window was already in its OWN native full-screen mode (F11 / the
  // macOS green-dot) before the assessment ever asked for fullscreen. In
  // that case document.fullscreenElement never gets set, no
  // "fullscreenchange" event fires, and the "Resume Fullscreen" button
  // looks completely broken to the user - see enterFullscreen() below.
  const [fullscreenHint, setFullscreenHint] = useState(false);
  const lastEscapeAtRef = useRef(0);
  // Last value we acted on, so the resize/poll watcher below only reports a
  // real true -> false transition instead of firing on every resize tick.
  const wasFullscreenRef = useRef(isEffectivelyFullscreen());
  const isReloadingRef = useRef(false);
  useEffect(() => {
  const handleBeforeUnload = () => {
    isReloadingRef.current = true;
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, []);

  useEffect(() => {
    setChallenge(null);
    setSelectedFile("");
    setResult(null);
    setIsRunning(false);
    setIsNavigating(false);
    setIsSwapped(false);
  }, [challengeId]);

  useEffect(() => {
    if (assessmentReady) {
      handleStartProctoring();
    }
  }, [assessmentReady]);
  useEffect(() => {
    async function loadSelectedChallenge() {
      if (!challengeId) return;

      const token = localStorage.getItem("token");

      if (!token) return;

      try {
        const response = await fetch(
          `${API_URL}/api/progress/current?challengeId=${encodeURIComponent(
            challengeId
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success || !data.data) {
          throw new Error(
            data.message || "Failed to load selected challenge"
          );
        }

        setChallenge(data.data);

        if (setSelectedChallenge) {
          setSelectedChallenge({
            challengeId: data.data.challengeId,
          });
        }
      } catch (error) {
        console.error(
          "Failed to load selected challenge:",
          error
        );
      }
    }

    loadSelectedChallenge();
  }, [challengeId, setSelectedChallenge]);

  /*
   * @param targetChallengeId  which question to check (defaults to the open one)
   * @param options.isNavigation  true when called while moving between
   *        questions with Next/Previous. Navigation must not pop the
   *        "Assessment Already Active" resume card - that card is only for
   *        someone re-entering/reloading mid-assessment.
   */
  const checkActiveAssessment = async (targetChallengeId = null, options = {}) => {
  const { isNavigation = false } = options;
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
      // This session belongs to one challenge only, so use its own saved
      // score as-is. Never blend it with whatever the previous question
      // happened to be showing.
      setIntegrityScore(
        typeof data.session.integrityScore === "number"
          ? data.session.integrityScore
          : 100
      );
      if (!isNavigation) setAssessmentAlreadyActive(true);
      return true;
    }
    
    if (isNavigation) {
  // No active session yet for THIS question - it's either brand new or was
  // never started, so its own score is 100. This does not touch any other
  // question's score - each question's integrity is isolated and, if it
  // already has an active session (handled above, hasActive === true),
  // that session's own saved score is used instead of this branch.
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
    /*
     * ALWAYS clear the loading gate.
     *
     * This used to be `if (!targetChallengeId)`, which meant that any
     * call that passed a challenge id (for example the check on first
     * load when a specific challenge was selected) left
     * checkingAssessment stuck at true forever - the screen sat on
     * "Checking assessment..." and the welcome card, the Start
     * Proctoring button and therefore the Instructions page were never
     * reachable.
     */
    setCheckingAssessment(false);
  }
};
useEffect(() => {
  const justLoggedIn = sessionStorage.getItem("justLoggedIn");
  const assessmentStarted =
    sessionStorage.getItem("assessmentStarted");

 // Fresh login → check if this challenge already has an active assessment
if (justLoggedIn === "true") {
  sessionStorage.removeItem("justLoggedIn");

   checkActiveAssessment(challengeId || null);

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

    /*
     * PER-QUESTION ISOLATION (client side).
     *
     * Only report an event when the session we are about to hit really
     * is the session for the question currently on screen. Without this,
     * a stale session id left over from the previous question could get
     * penalised for something the candidate did on a different question,
     * which is exactly the "one cheat locks everything" bug.
     */
    const sessionChallengeId =
      assessmentSession.challengeId || assessmentSession.challenge || null;
    const openChallengeId = challenge?.challengeId || challengeId || null;

    if (sessionChallengeId && openChallengeId && sessionChallengeId !== openChallengeId) {
      return;
    }

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

      /*
       * Set the score to exactly what the server says for THIS question.
       * It used to be Math.min(previousScore, newScore), which meant a
       * low score carried over from another question and could never go
       * back up - so one violation appeared to poison every question.
       */
      if (
        typeof data.integrityScore === "number" &&
        (!data.challengeId || data.challengeId === openChallengeId)
      ) {
        setIntegrityScore(data.integrityScore);
      }

      if (!data.challengeId || data.challengeId === openChallengeId) {
        setAssessmentSession((prev) =>
          prev ? { ...prev, lockedUntil: data.lockedUntil || null } : prev
        );
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
  challengeId:
    data.session.challengeId ||
    data.session.challenge,
  status: data.session.status || "active",
  lockedUntil: data.session.lockedUntil || null,
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

  /*
   * A MediaStream object can outlive its tracks: once a track ends (the
   * user hit "Stop sharing", revoked the permission, closed the camera
   * lid, or the OS reclaimed the device) the stream variable is still
   * truthy but completely dead. The old guards here were
   * `if (isWebcamShared && webcamStream) return true`, so once state got
   * out of sync we would silently "succeed" and NEVER ask for the camera
   * again. Checking for a live track is what makes the prompt come back.
   */
  function hasLiveVideo(stream) {
    return (
      !!stream &&
      stream.getVideoTracks().some((track) => track.readyState === "live")
    );
  }

  async function requestScreenShare() {
    if (hasLiveVideo(screenStream)) {
      setIsScreenShared(true);
      screenSharedRef.current = true;
      return true;
    }
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
    if (hasLiveVideo(webcamStream)) {
      setIsWebcamShared(true);
      return true;
    }

    try {
      /*
       * Ask for the camera explicitly, every time it isn't already live.
       * If the permission was previously denied for this site the browser
       * throws NotAllowedError instead of showing the prompt again - we
       * surface that below so the candidate knows to re-enable it from the
       * padlock icon rather than being left staring at nothing.
       */
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

      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        setResult({
          passed: false,
          message:
            "Camera permission is blocked for this site. Click the padlock icon in your browser's address bar, set Camera to Allow, then try again.",
        });
      } else if (error?.name === "NotFoundError" || error?.name === "NotReadableError") {
        setResult({
          passed: false,
          message:
            "No usable camera was found. Please connect a camera (and close any other app using it), then try again.",
        });
      }

      return false;
    }
  }

  // Centralised fullscreen entry. Used on start, on "Resume Fullscreen",
  // and on "Resume Assessment" so all three behave the same way and all
  // three get the same stuck-in-native-fullscreen detection below.
  async function enterFullscreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen could not be enabled:", error);
    }

    // Give the browser a moment to fire "fullscreenchange" (or not).
    setTimeout(() => {
      if (isEffectivelyFullscreen()) {
        // Either the Fullscreen API worked, or the window was already
        // covering the whole screen natively (F11). Both are fine - let
        // the candidate through instead of trapping them on this screen.
        wasFullscreenRef.current = true;
        setIsFullscreen(true);
        setFullscreenHint(false);
      } else {
        // requestFullscreen() resolved (or threw) but the page still
        // isn't fullscreen. The most common cause is that the browser
        // window itself was already full-screen outside of the
        // Fullscreen API (F11, or macOS's native full-screen), which
        // blocks a page from layering its own fullscreen on top in some
        // browsers. Surface this so the user knows to shrink/un-fullscreen
        // the window first instead of clicking a button that does nothing.
        setFullscreenHint(true);
      }
    }, 400);
  }

  /*
   * START SEQUENCE - the order below is deliberate and must not change:
   *
   *   1. SCREEN SHARE   - ask first, and require the whole screen.
   *   2. CAMERA         - only asked once the screen is actually shared,
   *                       so the candidate handles one browser permission
   *                       prompt at a time instead of two at once.
   *   3. FULLSCREEN     - entered before the question is revealed, so the
   *                       test literally starts in fullscreen and the
   *                       candidate never sees the question outside it.
   *   4. START SESSION + REVEAL QUESTION.
   *
   * `reuseMedia` is used when moving between questions with Next/Previous:
   * the screen share and camera are already running and fullscreen is
   * already on, so we skip steps 1-3 entirely. Re-asking there would pop
   * the permission dialogs again, and the permission dialog itself drops
   * the browser out of fullscreen - which is exactly the bug where
   * navigating between questions kicked the candidate out of fullscreen.
   */
  async function handleStartProctoring(targetId = null, options = {}) {
    const { reuseMedia = false } = options;

    try {
      setResult(null);

      if (!reuseMedia) {
        // 1. Screen first.
        const screenShared = await requestScreenShare();
        if (!screenShared) {
          setResult({
            passed: false,
            message: "Screen sharing is required to start the assessment.",
          });
          return;
        }

        // 2. Camera only after the screen is shared.
        const webcamShared = await requestWebcam();
        if (!webcamShared) {
          setResult({
            passed: false,
            message:
              "Camera access is required. Please turn your camera on to start the assessment.",
          });
          return;
        }

        // 3. Fullscreen before anything from the question is shown.
        await enterFullscreen();
      }

      // 4. Session + question.
      const session = await startAssessmentSession(targetId);
      sessionStorage.setItem("assessmentStarted", "true");
      setProctoringActive(true);

      // Safety net: if we came through reuseMedia and something dropped
      // fullscreen in the meantime, put it back before revealing.
      if (!document.fullscreenElement) {
        await enterFullscreen();
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

   const handleFullscreenChange = () => {
  const nowFullscreen = isEffectivelyFullscreen();

  // Nothing actually changed (this fires on every resize tick too).
  if (nowFullscreen === wasFullscreenRef.current) return;
  wasFullscreenRef.current = nowFullscreen;

  setIsFullscreen(nowFullscreen);
  if (nowFullscreen) {
    setFullscreenHint(false);
  }
  if (!nowFullscreen && !isReloadingRef.current) {
    // Pressing Esc is the browser's own built-in way of leaving fullscreen
    // and can't be preventDefault()'d, so a lot of these are just an
    // instinctive "get me out" tap rather than someone deliberately
    // switching to another app. Treat it as a lighter violation than exiting
    // fullscreen any other way (Alt-F4, window controls, OS gestures, etc.).
    const viaEscape = Date.now() - lastEscapeAtRef.current < 1000;
    reportIntegrityEvent(viaEscape ? "fullscreen_exit_esc" : "fullscreen_exit");
  }
};

    const handleCopy = (e) => { e.preventDefault(); reportIntegrityEvent("copy"); };
    const handlePaste = (e) => { e.preventDefault(); reportIntegrityEvent("paste"); };
    const handleCut = (e) => { e.preventDefault(); reportIntegrityEvent("cut"); };

    // Catches OS-level focus loss that visibilitychange misses: the Windows
    // Copilot key, Snap/split-screen, three-finger swipe to another app, etc.
    // These keep the tab "visible" (document.hidden stays false) but the
    // browser window itself loses focus.
    let lastBlurAt = 0;
    const handleWindowBlur = () => {
      if (document.hidden) return; // already covered by tab_switch
      if (Date.now() - screenshotState.at < 3000) return; // snipping overlay, not a penalty
      const now = Date.now();
      if (now - lastBlurAt < 1500) return; // debounce rapid refocus/blur churn
      lastBlurAt = now;
      reportIntegrityEvent("window_blur");
    };

    // Copy/cut/paste via Ctrl+C/V/X are already caught above through the
    // browser's native copy/paste/cut events - preventDefault there also
    // blocks the shortcut itself, so nothing extra is needed for those.
    //
    // DevTools shortcuts, the right-click "Inspect" menu, the console and
    // screenshot keys are ALL handled by useExamGuard (see
    // utils/examGuard.js), which is mounted further down. The only thing
    // left for this handler is remembering an Escape press so
    // handleFullscreenChange can tell an Esc exit (-3) apart from every
    // other way of leaving fullscreen (-4).
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        lastEscapeAtRef.current = Date.now();
      }
    };

    /*
     * Three listeners, one handler:
     *  - fullscreenchange: the Fullscreen API's own event.
     *  - resize: the ONLY signal a page gets when the user presses F11 /
     *    uses the OS full-screen toggle, which fires no fullscreenchange.
     *  - a slow poll: catches OS-level window changes that somehow emit
     *    neither, so the "Fullscreen Required" screen can never become a
     *    permanent dead end.
     */
    const fullscreenPoll = setInterval(handleFullscreenChange, 1000);

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleFullscreenChange);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      clearInterval(fullscreenPoll);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [proctoringActive, assessmentSession?.id]);

  // Per-tab identity, used so the server can tell "same browser tab
  // continuing" apart from "a second tab/browser opened the same account".
  // sessionStorage is scoped to a single tab, so a new value is generated
  // per tab and is never shared across tabs, windows, or browsers.
  useEffect(() => {
    let token = sessionStorage.getItem("proctoring_tab_token");
    if (!token) {
      token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("proctoring_tab_token", token);
    }
    tabTokenRef.current = token;
  }, []);

  /*
   * Blocks the console, DevTools shortcuts, the right-click "Inspect" /
   * "Inspect Console" menu, and screenshots for as long as proctoring is
   * on. Screenshots are blocked but carry a 0-point penalty on purpose.
   */
  const handleGuardViolation = useCallback(
    (type, metadata) => {
      reportIntegrityEvent(type, metadata);
    },
    [assessmentSession?.id, challenge?.challengeId]
  );

  useExamGuard(proctoringActive && !!assessmentSession?.id, handleGuardViolation);

  // Cross-browser / multiple-tab blocking.
  // Every few seconds, tell the server "this tab is still the one being
  // used". If another tab/browser sends a heartbeat while this one is
  // still fresh (or vice versa), the server treats it as a concurrent
  // session on the same account and deducts integrity points.
  useEffect(() => {
    if (!proctoringActive || !assessmentSession?.id) return;

    async function sendHeartbeat() {
      try {
        const token = localStorage.getItem("token");
        if (!token || !tabTokenRef.current) return;

        const response = await fetch(`${API_URL}/api/assessment/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tabToken: tabTokenRef.current,
            sessionId: assessmentSession.id,
          }),
        });

        const data = await response.json();

        if (data?.conflict) {
          setShowMultiSessionWarning(true);

          // Same per-question rule as reportIntegrityEvent: only apply
          // this to the question whose session the server actually hit.
          const openChallengeId = challenge?.challengeId || challengeId || null;
          const matchesOpenQuestion =
            !data.challengeId || !openChallengeId || data.challengeId === openChallengeId;

          if (matchesOpenQuestion && typeof data.integrityScore === "number") {
            setIntegrityScore(data.integrityScore);
          }
          if (matchesOpenQuestion) {
            setAssessmentSession((prev) =>
              prev ? { ...prev, lockedUntil: data.lockedUntil || null } : prev
            );
          }
        }
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 6000);
    return () => clearInterval(interval);
  }, [proctoringActive, assessmentSession?.id]);

  // Best-effort detection of AI-assistant browser extensions (ChatGPT,
  // Gemini, Copilot sidebars, etc.) that inject their own UI into every
  // page, including this one. A web page cannot actually disable another
  // extension - the browser sandboxes extensions from page JS on purpose
  // - so this is a heuristic: watch for newly injected elements that look
  // like a third-party assistant overlay and penalize when seen.
  useEffect(() => {
    if (!proctoringActive || !assessmentSession?.id) return;

    const SUSPICIOUS_PATTERNS = [
      /chat[-_ ]?gpt/i,
      /gemini/i,
      /copilot/i,
      /claude/i,
      /\bbard\b/i,
      /perplexity/i,
      /ai[-_ ]?assistant/i,
      /sider/i,
      /monica/i,
    ];

    function looksSuspicious(node) {
      if (!(node instanceof HTMLElement)) return false;

      const fingerprint = `${node.id || ""} ${node.className || ""}`;
      if (SUSPICIOUS_PATTERNS.some((re) => re.test(fingerprint))) return true;

      if (node.tagName === "IFRAME") {
        const src = node.getAttribute("src") || "";
        if (SUSPICIOUS_PATTERNS.some((re) => re.test(src))) return true;
      }

      // Common pattern for injected sidebar/overlay widgets: a
      // full-screen fixed-position element with an unusually high
      // z-index that our own app never creates.
      const zIndex = parseInt(node.style?.zIndex || "0", 10);
      if (node.style?.position === "fixed" && zIndex > 999999) return true;

      return false;
    }

    let lastReportAt = 0;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (looksSuspicious(node)) {
            const now = Date.now();
            if (now - lastReportAt > 5000) {
              lastReportAt = now;
              reportIntegrityEvent("suspicious_extension", {
                tag: node.tagName,
                id: node.id || null,
              });
            }
            return;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
    // NOTE: we intentionally do NOT use window.confirm() here.
    // Native browser dialogs (confirm/alert/prompt) force the browser out of
    // fullscreen as a side effect, which was triggering our own
    // fullscreenchange -> "fullscreen_exit" integrity penalty. Using an
    // in-page modal instead keeps fullscreen intact.
    setShowResetConfirm(true);
  }

  function confirmResetCode() {
    setShowResetConfirm(false);
    localStorage.removeItem(`challenge_code_${challenge.challengeId}`);
    loadChallenge("current");
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
      const hasActive = await checkActiveAssessment(nextChallenge.challengeId, {
        isNavigation: true,
      });

      if (hasActive) {
        setProctoringActive(true);
        // Navigating must never drop fullscreen.
        if (!document.fullscreenElement) await enterFullscreen();
      } else if (wasProctoring) {
        /*
         * Still mid-assessment, just on a different question. Reuse the
         * screen share / camera that are already running and stay in
         * fullscreen - do NOT re-prompt for permissions here.
         */
        await handleStartProctoring(nextChallenge.challengeId, { reuseMedia: true });
        if (!document.fullscreenElement) await enterFullscreen();
      } else {
        setProctoringActive(false);
        setIsSwapped(false);
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

 if (typeof data.integrityScore === "number") {
  setIntegrityScore(data.integrityScore);
}
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

  // Horizontal drag: resizes the question (challenge-panel) vs code editor split
  function startPanelResize(e) {
    e.preventDefault();
    const sidebarWidth = 250; // matches .sidebar fixed width in index.css
    function resize(event) {
      const newWidth = event.clientX - sidebarWidth;
      if (newWidth >= 200 && newWidth <= 700) setPanelWidth(newWidth);
    }

    function stopResize() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
  }
  const isLockedOut =
  assessmentSession?.lockedUntil &&
  new Date(assessmentSession.lockedUntil) > new Date();
useEffect(() => {
  if (!assessmentSession?.lockedUntil) return;

  const lockedUntil = new Date(
    assessmentSession.lockedUntil
  ).getTime();

  const remaining = lockedUntil - Date.now();

  if (remaining <= 0) {
    setIntegrityScore(100);

    setAssessmentSession((prev) =>
      prev
        ? {
            ...prev,
            integrityScore: 100,
            lockedUntil: null,
          }
        : prev
    );

    return;
  }

  const timer = setTimeout(() => {
    setIntegrityScore(100);

    setAssessmentSession((prev) =>
      prev
        ? {
            ...prev,
            integrityScore: 100,
            lockedUntil: null,
          }
        : prev
    );
  }, remaining);

  return () => clearTimeout(timer);
}, [assessmentSession?.lockedUntil]);
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

              await enterFullscreen();

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

if (proctoringActive && !isFullscreen) {
  return (
    <div className="badge-screen-container">
      <div className="assessment-active-card" style={{ borderColor: "#ef4444" }}>
        <div className="assessment-active-icon" style={{ color: "#ef4444" }}>
          🖥️
        </div>
        <h2>Fullscreen Required</h2>
        <p>You must stay in fullscreen to continue the assessment. Exiting fullscreen negatively impacts your integrity score.</p>
        {fullscreenHint && (
          <p style={{ color: "#fbbf24", fontSize: "14px", lineHeight: "1.5" }}>
            Your browser is refusing the full-screen request. This usually means the
            window is already in its own full-screen mode from before the test started
            (for example you pressed <strong>F11</strong>). Press <strong>F11</strong>
            again to leave it, then click the button below — or simply press
            <strong> F11</strong> to go full-screen and this screen will clear by itself.
          </p>
        )}
        <button
          className="badge-start-btn"
          style={{ backgroundColor: "#ef4444" }}
          onClick={() => enterFullscreen()}
        >
          Resume Fullscreen
        </button>

        {/*
          Escape hatch. The watcher already re-checks every second, but this
          gives the candidate something to press so this screen can never
          feel like a dead end.
        */}
        <button
          className="nav-button"
          style={{ marginTop: "12px" }}
          onClick={() => {
            if (isEffectivelyFullscreen()) {
              wasFullscreenRef.current = true;
              setIsFullscreen(true);
              setFullscreenHint(false);
            } else {
              setFullscreenHint(true);
            }
          }}
        >
          I'm already in full-screen — continue
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

if (proctoringActive && showMultiSessionWarning) {
  return (
    <div className="badge-screen-container">
      <div className="assessment-active-card" style={{ borderColor: "#ef4444" }}>
        <div className="assessment-active-icon" style={{ color: "#ef4444" }}>
          🚫
        </div>
        <h2>Another Session Detected</h2>
        <p>This account is being used in another browser tab or another browser at the same time. Only one active session is allowed - points have been deducted from your integrity score.</p>
        <button
          className="badge-start-btn"
          style={{ backgroundColor: "#ef4444" }}
          onClick={() => setShowMultiSessionWarning(false)}
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
                onClick={() => onStartAssessment?.()}
                disabled={proctoringActive}
              >
                🛡 Start Proctoring
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
      {showResetConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#1e1e1e",
              border: "1px solid #3c3c3c",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "380px",
              color: "white",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "12px" }}>Reset code?</h3>
            <p style={{ color: "#aaaaaa", marginBottom: "20px" }}>
              This will reset your code to the original state for this question. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button className="nav-button" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button
                className="nav-button"
                style={{ backgroundColor: "#ef4444", color: "white", border: "none" }}
                onClick={confirmResetCode}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

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
            onClick={() => handleStartProctoring()}
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
            {isRunning ? "Running..." : "▶️ Run"}
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
<div
  className="challenge-panel"
  style={{
    width: `${panelWidth}px`,
    minWidth: "200px",
  }}
>
  <h2>{challenge.title}</h2>

  <h3>Problem</h3>
  <p>{challenge.description}</p>

  {challenge.projectOverview && (
    <>
      <h3>Project Overview</h3>

      <h4>Application</h4>
      <p>{challenge.projectOverview.application}</p>

      <h4>Architecture</h4>
      <pre className="project-overview-code">
        {challenge.projectOverview.architecture}
      </pre>

      <h4>Request Flow</h4>
      <pre className="project-overview-code">
        {challenge.projectOverview.requestFlow}
      </pre>

      <h4>Project Structure</h4>
      <pre className="project-overview-code">
        {challenge.projectOverview.projectStructure}
      </pre>

      <h4>Responsibilities</h4>
      <pre className="project-overview-code">
        {challenge.projectOverview.responsibilities}
      </pre>

      <h4>Investigation Guide</h4>
      <p>{challenge.projectOverview.investigationGuide}</p>
    </>
  )}

  <h3>Requirements</h3>

  <ul>
    {challenge.requirements.map((requirement, index) => (
      <li key={index}>{requirement}</li>
    ))}
  </ul>
</div>

<div
  className="panel-resize-handle"
  onMouseDown={startPanelResize}
/>

            <div className="panel-resize-handle" onMouseDown={startPanelResize} />

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
      )}
    </div>
  );
}

export default ChallengeWorkspace;