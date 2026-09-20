import React, { useEffect } from "react";
import "./Instructions.css";

export default function Instructions({ onProceed }) {
  useEffect(() => {
    // Function to request camera permission
    const requestCameraPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Camera permission granted");
      } catch (error) {
        console.error("Camera permission denied", error);
      }
    };

    requestCameraPermission();
  }, []);

  return (
    <div className="hr-instructions-container">
      <div className="hr-header-bar">
        <div className="hr-header-title">
          <span className="hr-icon">📝</span> Assessment Instructions
        </div>
      </div>

      <div className="hr-content">
        {/* General Instructions */}
        <div className="hr-section">
          <div className="hr-section-title">
            <span className="hr-section-icon">▤</span> General Instructions
          </div>
          <ul className="hr-list">
            <li>This is a strictly proctored assessment.</li>
            <li>You must grant permissions for Screen Sharing and Camera Access to begin the assessment.</li>
            <li>Your entire screen must be shared. Sharing only a window or tab will result in an error.</li>
            <li>Use the "Run" button to test your solution against sample test cases before submitting.</li>
            <li>Ensure you have a stable internet connection before beginning.</li>
          </ul>
        </div>

        {/* How the assessment starts */}
        <div className="hr-section">
          <div className="hr-section-title">
            <span className="hr-section-icon">▤</span> How Your Assessment Starts
          </div>
          <p className="hr-subtitle">
            When you click <strong>Start Proctoring</strong>, these three steps happen in order:
          </p>
          <ul className="hr-list">
            <li><strong>1. Screen sharing</strong> — you will be asked to share your screen first. Choose <strong>Entire Screen</strong>; a single tab or window will be rejected.</li>
            <li><strong>2. Camera</strong> — only after the screen is shared will your browser ask for camera permission. You must turn your camera on and keep it on for the whole assessment.</li>
            <li><strong>3. Full-screen</strong> — the test then opens in full-screen automatically, and the question is only revealed once you are in full-screen.</li>
          </ul>
          <p className="hr-subtitle">
            You must stay in full-screen for the entire assessment. Moving between questions with
            <strong> Next</strong> or <strong>Previous</strong> keeps you in full-screen and will not
            ask for your screen or camera again.
          </p>
        </div>

        {/* Integrity Indicators */}
        <div className="hr-section">
          <div className="hr-section-title">
            <span className="hr-section-icon">▤</span> Integrity Score Indicators
          </div>
          <p className="hr-subtitle">
            Your initial integrity score is <strong>100</strong>. Points will be deducted for prohibited actions.
          </p>
          <div className="hr-table-wrapper">
            <table className="hr-table">
              <thead>
                <tr>
                  <th>ACTION</th>
                  <th>PENALTY</th>
                  <th>DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="hr-badge warning">Tab / Browser Switch</span>
                  </td>
                  <td>-5 points</td>
                  <td>Switching to another browser tab, another application, or minimizing the window.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge warning">Copy / Paste / Cut</span>
                  </td>
                  <td>-3 points</td>
                  <td>Copying from or pasting to outside sources (Ctrl/Cmd + C, V, or X).</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge warning">Exit Full-Screen</span>
                  </td>
                  <td>-4 points</td>
                  <td>Leaving full-screen mode during the test by any means other than the Esc key.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge warning">Developer Tools</span>
                  </td>
                  <td>-3 points</td>
                  <td>F12, Ctrl/Cmd + Shift + I / J / C / K, or Ctrl/Cmd + U. The browser console is disabled during the test.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge warning">Right Click</span>
                  </td>
                  <td>-2 points</td>
                  <td>The right-click menu is disabled, so Inspect and Console cannot be opened from it.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge critical">Stop Screen Share / Camera</span>
                  </td>
                  <td>-10 points</td>
                  <td>Revoking screen sharing or camera access permissions.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge critical">Multiple Sessions</span>
                  </td>
                  <td>-15 points</td>
                  <td>Using the same account in a second tab or a second browser at the same time.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge critical">AI Assistant Extension</span>
                  </td>
                  <td>-8 points</td>
                  <td>An AI assistant sidebar or overlay extension detected on the page.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge">Screenshots</span>
                  </td>
                  <td>Blocked (0 points)</td>
                  <td>Screenshot shortcuts are blocked and the clipboard is cleared. No points are deducted for this.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Plagiarism & Zero Tolerance */}
        <div className="hr-section">
          <div className="hr-section-title">
            <span className="hr-section-icon">▤</span> Zero Tolerance Policy
          </div>
          <ul className="hr-list">
            <li>All code submissions will be checked for plagiarism after you're finished.</li>
            <li>Your integrity score is tracked <strong>separately for every question</strong>. A violation on one question affects only that question&apos;s score — the rest of your questions are untouched.</li>
            <li>If your integrity score drops to <strong>70 or below</strong> on a question, that question instantly terminates.</li>
            <li>Hitting the penalty threshold locks <strong>only that specific question, for 1 hour</strong>. You can carry on with every other question as normal.</li>
          </ul>
        </div>

        <div className="hr-section">
          <div className="hr-section-title" style={{ border: 'none', paddingBottom: '5px' }}>
            ⚠ Please refrain from performing the following restricted events:
          </div>
          <div className="hr-tags">
            <span className="hr-tag">Tab Switching</span>
            <span className="hr-tag">Copy & Paste</span>
            <span className="hr-tag">Exiting Fullscreen</span>
            <span className="hr-tag">Stopping Streams</span>
            <span className="hr-tag">Opening DevTools</span>
            <span className="hr-tag">Right-Click Menu</span>
            <span className="hr-tag">Screenshots</span>
            <span className="hr-tag">Browser Console</span>
            <span className="hr-tag">Multiple Tabs / Browsers</span>
            <span className="hr-tag">AI Assistant Extensions</span>
          </div>
        </div>

        <div className="hr-footer">
          <button className="hr-proceed-btn" onClick={onProceed}>
            I Understand and Agree
          </button>
        </div>
      </div>
    </div>
  );
}