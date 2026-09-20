const AssessmentSession = require("../models/AssessmentSession");
const User = require("../models/User");
const challenges = require("../challenges/challenges");

/*
 * ---------------------------------------------------------------
 * INTEGRITY PENALTY TABLE (single source of truth)
 * ---------------------------------------------------------------
 * These values are intentionally kept in ONE place so the server,
 * and the Instructions page shown to the candidate, can never drift
 * apart. If you change a number here, change it in
 * client/src/pages/Instructions.jsx too.
 *
 * A penalty of 0 means: the action is BLOCKED / logged, but the
 * candidate is NOT penalised for it (screenshots work this way -
 * we stop what we can and record the attempt, but take no points).
 */
const INTEGRITY_PENALTIES = {
  // Leaving the test
  tab_switch: 5,            // switching tab
  window_blur: 5,           // switching browser / app
  fullscreen_exit: 4,       // leaving fullscreen any way other than Esc
  fullscreen_exit_esc: 3,   // leaving fullscreen with the Esc key

  // Clipboard (Ctrl/Cmd + C / V / X)
  copy: 3,
  paste: 3,
  cut: 3,

  // Dev tools / inspecting
  right_click: 2,
  shortcut: 3,              // F12, Ctrl+Shift+I/J/C/K, Ctrl+U, ...

  // Streams & multi-session
  multiple_session: 15,
  screen_share_stopped: 10,
  webcam_stopped: 10,
  suspicious_extension: 8,

  // Blocked but NOT penalised
  screenshot_attempt: 0,
};

// Integrity at or below this value locks THAT question (and only that
// question) for the duration below.
const LOCK_THRESHOLD = 70;
const LOCK_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour
const getAssessmentChallenge = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await AssessmentSession.findOne({
      _id: id,
      candidate: req.user._id,
      status: "active",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active assessment session not found",
      });
    }

    const challenge = challenges.find(
      (item) => item.challengeId === session.challenge
    );

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    return res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error("Get assessment challenge error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load assessment challenge",
    });
  }
};
const startAssessment = async (req, res) => {
  try {
    let { challengeId } = req.body;

    /*
     * If the frontend already knows the challenge ID
     * (for example, Practice Again), use it.
     *
     * If not, choose the user's current unsolved
     * challenge on the server.
     */
    if (!challengeId) {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const solvedChallenges =
        user.solvedChallenges || [];

      const currentChallenge =
        challenges.find(
          (challenge) =>
            !solvedChallenges.includes(
              challenge.challengeId
            )
        );

      if (!currentChallenge) {
        return res.status(404).json({
          success: false,
          message:
            "No challenges available right now.",
        });
      }

      challengeId =
        currentChallenge.challengeId;
    }

    /*
     * Verify that the challenge actually exists.
     */
    const challenge = challenges.find(
      (item) =>
        item.challengeId === challengeId
    );

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    /*
     * Don't allow two active assessments for
     * the same candidate/challenge.
     */
    const existingSession =
      await AssessmentSession.findOne({
        candidate: req.user._id,
        challenge: challengeId,
        status: "active",
      });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an active assessment session",
        session: existingSession,
      });
    }

    /*
     * Start assessment.
     *
     * NO TIMER.
     *
     * Integrity score is per-question, not shared across the whole
     * attempt. A brand new question always starts at 100. Re-entering a
     * question that already has an active (unsubmitted) session is
     * handled above (the 409 branch) and returns that session as-is, so
     * whatever score it had (e.g. 90) is preserved when the candidate
     * comes back to it later - it is NOT reset, and it is NOT affected
     * by what happened on other questions.
     */
    const startedAt = new Date();

    const session =
      await AssessmentSession.create({
        candidate: req.user._id,
        challenge: challengeId,
        startedAt,
        status: "active",
        integrityScore: 100,
      });

    /*
     * IMPORTANT:
     *
     * We return only session information here.
     *
     * We DO NOT return the challenge,
     * description, requirements, or files.
     */
    return res.status(201).json({
      success: true,

      session: {
  id: session._id,
  challengeId: session.challenge,
  startedAt: session.startedAt,
  integrityScore: session.integrityScore,
  status: session.status,
  lockedUntil: session.lockedUntil || null,
},
    });
  } catch (error) {
    console.error(
      "Start assessment error:",
      error
    );
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already have an active assessment session",
      });
    }


    return res.status(500).json({
      success: false,
      message:
        "Failed to start assessment",
    });
  }
};

const recordIntegrityEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, metadata } = req.body;

    const allowedEvents = Object.keys(INTEGRITY_PENALTIES);

    if (!allowedEvents.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid integrity event",
      });
    }

    const session = await AssessmentSession.findOne({
      _id: id,
      candidate: req.user._id,
      status: "active",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active assessment session not found",
      });
    }

    /*
     * PER-QUESTION ISOLATION:
     *
     * This session belongs to exactly ONE challenge (session.challenge).
     * Everything below - the score, the events, the lock - is stored on
     * this document only, so a violation here can never touch any other
     * question's session or score.
     */

    // If THIS question is already locked, stop deducting. The candidate
    // can't interact with it anyway, and further events would otherwise
    // keep draining a score that is already being reset when the lock
    // expires.
    const alreadyLocked =
      session.lockedUntil &&
      new Date(session.lockedUntil) > new Date();

    if (alreadyLocked) {
      return res.json({
        success: true,
        challengeId: session.challenge,
        integrityScore: session.integrityScore,
        lockedUntil: session.lockedUntil,
        locked: true,
      });
    }

    const penalty = INTEGRITY_PENALTIES[type] || 0;

    // Reduce integrity score (penalty 0 events are logged only)
    session.integrityScore = Math.max(
      0,
      session.integrityScore - penalty
    );

    // Record the event
    session.events.push({
      type,
      metadata: metadata || {},
    });

    // Lock ONLY this question if its integrity reaches the threshold
    if (session.integrityScore <= LOCK_THRESHOLD) {
      session.lockedUntil = new Date(
        Date.now() + LOCK_DURATION_MS
      );
    }

    // IMPORTANT:
    // Always save the updated score and event
    await session.save();

    return res.json({
      success: true,
      challengeId: session.challenge,
      penalty,
      integrityScore: session.integrityScore,
      lockedUntil: session.lockedUntil || null,
      locked: !!session.lockedUntil,
    });
  } catch (error) {
    console.error(
      "Record integrity event error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to record integrity event",
    });
  }
};


const submitAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await AssessmentSession.findOne({
      _id: id,
      candidate: req.user._id,
      status: "active",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active assessment session not found",
      });
    }

    session.status = "submitted";
    session.submittedAt = new Date();

    await session.save();

    return res.json({
      success: true,
      message: "Assessment submitted successfully",
      assessment: {
        id: session._id,
        status: session.status,
        submittedAt: session.submittedAt,
        integrityScore: session.integrityScore,
      },
    });
  } catch (error) {
    console.error("Submit assessment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit assessment",
    });
  }
};

// A tab is considered "gone" (closed/crashed/asleep) if we haven't heard
// from it in this long - after that, a new tab can take over ownership
// without being treated as a conflict.
const TAB_HEARTBEAT_STALE_MS = 15 * 1000;

const heartbeat = async (req, res) => {
  try {
    const { tabToken, sessionId } = req.body;

    if (!tabToken) {
      return res.status(400).json({
        success: false,
        message: "tabToken is required",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const now = Date.now();
    const ownerToken = user.activeTabToken;
    const ownerAge = user.activeTabHeartbeatAt
      ? now - new Date(user.activeTabHeartbeatAt).getTime()
      : Infinity;

    const conflict =
      ownerToken &&
      ownerToken !== tabToken &&
      ownerAge < TAB_HEARTBEAT_STALE_MS;

    if (conflict) {
      // Someone else (same browser, second tab, or a completely different
      // browser) is actively using this account right now. Penalize the
      // session that's currently open in THIS tab, if we have one.
      if (sessionId) {
        const session = await AssessmentSession.findOne({
          _id: sessionId,
          candidate: req.user._id,
          status: "active",
        });

        if (session) {
          const alreadyLocked =
            session.lockedUntil &&
            new Date(session.lockedUntil) > new Date();

          if (!alreadyLocked) {
            session.integrityScore = Math.max(
              0,
              session.integrityScore - INTEGRITY_PENALTIES.multiple_session
            );
            session.events.push({
              type: "multiple_session",
              metadata: { tabToken },
            });

            if (session.integrityScore <= LOCK_THRESHOLD) {
              session.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
            }

            await session.save();
          }

          return res.json({
            success: true,
            conflict: true,
            challengeId: session.challenge,
            integrityScore: session.integrityScore,
            lockedUntil: session.lockedUntil || null,
          });
        }
      }

      return res.json({ success: true, conflict: true });
    }

    // No conflict - this tab is (or becomes) the owner.
    user.activeTabToken = tabToken;
    user.activeTabHeartbeatAt = new Date();
    await user.save();

    return res.json({ success: true, conflict: false });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record heartbeat",
    });
  }
};

const getActiveAssessment = async (req, res) => {
  try {
    const { challengeId } = req.query;

    let query = {
      candidate: req.user._id,
      status: "active",
    };

    if (challengeId) {
      query.challenge = challengeId;
    }

    const session = await AssessmentSession.findOne(query)
      .sort({ createdAt: -1 });

    if (!session) {
      return res.json({
        success: true,
        active: false,
      });
    }

    // If the 1-hour lock has expired,
    // reset the integrity score and unlock the challenge.
    if (
      session.lockedUntil &&
      new Date(session.lockedUntil) <= new Date()
    ) {
      session.integrityScore = 100;
      session.lockedUntil = null;

      await session.save();
    }

    return res.json({
      success: true,
      active: true,
      session: {
        id: session._id,
        challengeId: session.challenge,
        startedAt: session.startedAt,
        integrityScore: session.integrityScore,
        status: session.status,
        lockedUntil: session.lockedUntil,
      },
    });
  } catch (error) {
    console.error(
      "Get active assessment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to check active assessment",
    });
  }
};
module.exports = {
  startAssessment,
  recordIntegrityEvent,
  submitAssessment,
   getAssessmentChallenge,
   getActiveAssessment,
   heartbeat,
   INTEGRITY_PENALTIES,
   LOCK_THRESHOLD,
};