import { useEffect, useState } from "react";

import FileExplorer from "../components/FileExplorer";
import CodeEditor from "../components/CodeEditor";
import TestResults from "../components/TestResults";

const CHALLENGE_CACHE_KEY = "currentChallenge";

function ChallengeWorkspace({ selectedChallenge }) {
  // ------------------------------------
  // INITIAL STATE FROM CACHE
  // ------------------------------------

  const [challenge, setChallenge] = useState(() => {
    if (selectedChallenge) {
      return selectedChallenge;
    }

    try {
      const cachedChallenge = sessionStorage.getItem(
        CHALLENGE_CACHE_KEY
      );

      return cachedChallenge
        ? JSON.parse(cachedChallenge)
        : null;
    } catch {
      return null;
    }
  });

  const [terminalHeight, setTerminalHeight] =
    useState(150);

  const [selectedFile, setSelectedFile] =
    useState(() => {
      if (selectedChallenge?.files) {
        return (
          Object.keys(selectedChallenge.files)[0] || ""
        );
      }

      try {
        const cachedChallenge = sessionStorage.getItem(
          CHALLENGE_CACHE_KEY
        );

        if (cachedChallenge) {
          const parsed = JSON.parse(cachedChallenge);

          if (parsed?.files) {
            return (
              Object.keys(parsed.files)[0] || ""
            );
          }
        }
      } catch {
        return "";
      }

      return "";
    });

  const [result, setResult] = useState(null);

  const [isRunning, setIsRunning] =
    useState(false);

  const [isNavigating, setIsNavigating] =
    useState(false);

  // ------------------------------------
  // SAVE CHALLENGE TO CACHE
  // ------------------------------------

  function saveChallengeToCache(challengeData) {
    try {
      sessionStorage.setItem(
        CHALLENGE_CACHE_KEY,
        JSON.stringify(challengeData)
      );
    } catch (error) {
      console.error(
        "Failed to cache challenge:",
        error
      );
    }
  }

  // ------------------------------------
  // LOAD INITIAL CHALLENGE
  // ------------------------------------

  useEffect(() => {
    // PRACTICE AGAIN
    if (selectedChallenge) {
      setChallenge(selectedChallenge);
      setResult(null);

      const firstFile = Object.keys(
        selectedChallenge.files
      )[0];

      if (firstFile) {
        setSelectedFile(firstFile);
      }

      saveChallengeToCache(selectedChallenge);

      return;
    }

    // FETCH CURRENT CHALLENGE
    async function fetchChallenge() {
      try {
        const token =
          localStorage.getItem("token");

        if (!token) {
          throw new Error(
            "You are not logged in"
          );
        }

        const response = await fetch(
          "https://sandbox-11.onrender.com/api/progress/current",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Failed to fetch challenge"
          );
        }

        const challengeData = data.data;

        if (!challengeData?.files) {
          throw new Error(
            "Invalid challenge data received"
          );
        }

        // Update silently
        setChallenge(challengeData);
        setResult(null);

        saveChallengeToCache(challengeData);

        const firstFile = Object.keys(
          challengeData.files
        )[0];

        if (firstFile) {
          setSelectedFile(firstFile);
        }
      } catch (error) {
        console.error(
          "Failed to fetch challenge:",
          error
        );

        if (!challenge) {
          setResult({
            passed: false,
            message:
              error.message ||
              "Failed to load challenge",
          });
        }
      }
    }

    fetchChallenge();
  }, [selectedChallenge]);

  // ------------------------------------
  // UPDATE CODE
  // ------------------------------------

  function handleCodeChange(newCode) {
    setChallenge((previous) => {
      if (!previous) {
        return previous;
      }

      const updatedChallenge = {
        ...previous,
        files: {
          ...previous.files,
          [selectedFile]: newCode || "",
        },
      };

      saveChallengeToCache(updatedChallenge);

      return updatedChallenge;
    });
  }

  // ------------------------------------
  // LOAD NEXT / PREVIOUS
  // ------------------------------------

  async function loadChallenge(direction) {
    if (isNavigating || isRunning) {
      return;
    }

    try {
      setIsNavigating(true);
      setResult(null);

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "You are not logged in"
        );
      }

      const response = await fetch(
        `https://sandbox-11.onrender.com/api/progress/${direction}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to load ${direction} challenge`
        );
      }

      if (!data.success) {
        setResult({
          passed: false,
          message: data.message,
        });

        return;
      }

      const challengeData = data.data;

      if (!challengeData?.files) {
        throw new Error(
          "Invalid challenge data received"
        );
      }

      setChallenge(challengeData);

      saveChallengeToCache(challengeData);

      const firstFile = Object.keys(
        challengeData.files
      )[0];

      if (firstFile) {
        setSelectedFile(firstFile);
      }
    } catch (error) {
      console.error(
        `Failed to load ${direction} challenge:`,
        error
      );

      setResult({
        passed: false,
        message:
          error.message ||
          `Failed to load ${direction} challenge`,
      });
    } finally {
      setIsNavigating(false);
    }
  }

  // ------------------------------------
  // RUN CHALLENGE
  // ------------------------------------

  async function handleRun() {
    try {
      setIsRunning(true);
      setResult(null);

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "You are not logged in"
        );
      }

      if (!challenge) {
        throw new Error(
          "No challenge loaded"
        );
      }

      const response = await fetch(
        "https://sandbox-11.onrender.com/api/challenges/run",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            challengeId:
              challenge.challengeId,

            files:
              challenge.files,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to run challenge"
        );
      }

      setResult(data);

      // ------------------------------------
      // UPDATE USER ONLY FOR NEW SOLVE
      // ------------------------------------

      if (
        data.passed &&
        data.newlySolved
      ) {
        const meResponse = await fetch(
          "https://sandbox-11.onrender.com/api/auth/me",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const meData =
          await meResponse.json();

        if (
          meResponse.ok &&
          meData.success
        ) {
          localStorage.setItem(
            "user",
            JSON.stringify(
              meData.user
            )
          );

          window.dispatchEvent(
            new Event("userUpdated")
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to run challenge:",
        error
      );

      setResult({
        passed: false,

        message:
          error.message ||
          "Something went wrong while running the challenge.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  // ------------------------------------
  // DETECT FILE LANGUAGE
  // ------------------------------------

  function getLanguage(fileName) {
    if (!fileName) {
      return "plaintext";
    }

    if (fileName.endsWith(".jsx")) {
      return "javascript";
    }

    if (fileName.endsWith(".js")) {
      return "javascript";
    }

    if (fileName.endsWith(".json")) {
      return "json";
    }

    if (fileName.endsWith(".css")) {
      return "css";
    }

    if (fileName.endsWith(".html")) {
      return "html";
    }

    return "plaintext";
  }

  // ------------------------------------
  // TERMINAL RESIZE
  // ------------------------------------

  function startResize(e) {
    e.preventDefault();

    function resize(event) {
      const newHeight =
        window.innerHeight -
        event.clientY;

      if (
        newHeight >= 70 &&
        newHeight <= 500
      ) {
        setTerminalHeight(newHeight);
      }
    }

    function stopResize() {
      document.removeEventListener(
        "mousemove",
        resize
      );

      document.removeEventListener(
        "mouseup",
        stopResize
      );
    }

    document.addEventListener(
      "mousemove",
      resize
    );

    document.addEventListener(
      "mouseup",
      stopResize
    );
  }

  // ------------------------------------
  // NO CHALLENGE YET
  // ------------------------------------

  if (!challenge) {
    return (
      <div className="workspace">
        <div className="workspace-content" />
      </div>
    );
  }

  // ------------------------------------
  // UI
  // ------------------------------------

  return (
    <div className="workspace">

      {/* TOPBAR */}

      <header className="topbar">

        {/* CHALLENGE NAME */}

        <div className="challenge-name">
          {challenge.title}
        </div>

        {/* ACTIONS */}

        <div className="topbar-actions">

          <button
            className="nav-button"
            onClick={() =>
              loadChallenge("previous")
            }
            disabled={
              isNavigating ||
              isRunning
            }
          >
            ← Previous
          </button>

          <button
            className="nav-button"
            onClick={() =>
              loadChallenge("next")
            }
            disabled={
              isNavigating ||
              isRunning
            }
          >
            Next →
          </button>

          <button
            className="run-button"
            onClick={handleRun}
            disabled={
              isRunning ||
              isNavigating
            }
          >
            {isRunning
              ? "Running..."
              : "▶ Run"}
          </button>

        </div>
      </header>

      {/* MAIN CONTENT */}

      <div className="workspace-content">

        {/* FILE EXPLORER */}

        <div className="sidebar">
          <FileExplorer
            files={challenge.files}
            selectedFile={selectedFile}
            onSelectFile={
              setSelectedFile
            }
          />
        </div>

        {/* CHALLENGE DETAILS */}

        <div className="challenge-panel">

          <h2>
            {challenge.title}
          </h2>

          <h3>Problem</h3>

          <p>
            {challenge.description}
          </p>

          <h3>
            Requirements
          </h3>

          <ul>
            {challenge.requirements.map(
              (requirement, index) => (
                <li key={index}>
                  {requirement}
                </li>
              )
            )}
          </ul>

        </div>

        {/* CODE EDITOR */}

        <div className="editor-area">

          <h3>
            {selectedFile}
          </h3>

          <div className="editor-container">

            <CodeEditor
              code={
                challenge.files[
                  selectedFile
                ] || ""
              }

              onChange={
                handleCodeChange
              }

              language={
                getLanguage(
                  selectedFile
                )
              }
            />

          </div>

        </div>

      </div>

      {/* RESIZE HANDLE */}

      <div
        className="resize-handle"
        onMouseDown={startResize}
      />

      {/* TERMINAL */}

      <div
        className="terminal-panel"
        style={{
          height:
            `${terminalHeight}px`,
        }}
      >

        <TestResults
          result={result}
          isRunning={isRunning}
        />

      </div>

    </div>
  );
}

export default ChallengeWorkspace;