import React from "react";
import "./Instructions.css";

export default function Instructions({ onProceed }) {
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
            <li>You must grant permissions for Screen Sharing and Webcam Access to begin the assessment.</li>
            <li>Your entire screen must be shared. Sharing only a window or tab will result in an error.</li>
            <li>Use the "Run" button to test your solution against sample test cases before submitting.</li>
            <li>Ensure you have a stable internet connection before beginning.</li>
          </ul>
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
                    <span className="hr-badge warning">Tab Switch</span>
                  </td>
                  <td>-3 points</td>
                  <td>Switching to another browser tab or minimizing the window.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge warning">Copy / Paste / Cut</span>
                  </td>
                  <td>-5 points</td>
                  <td>Copying from or pasting to outside sources.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge warning">Exit Full-Screen</span>
                  </td>
                  <td>-5 points</td>
                  <td>Manually exiting full-screen mode during the test.</td>
                </tr>
                <tr>
                  <td>
                    <span className="hr-badge critical">Stop Screen Share</span>
                  </td>
                  <td>-10 points</td>
                  <td>Revoking screen sharing or webcam access permissions.</td>
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
            <li>If your integrity score drops to <strong>70 or below</strong> on a question, the assessment for that question will instantly terminate.</li>
            <li>Hitting the penalty threshold results in being <strong>permanently locked out of that specific question for 1 hour</strong>. You may still complete other questions.</li>
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
