const AssessmentSession = require("../models/AssessmentSession");
const User = require("../models/User");
const challenges = require("../challenges/challenges");
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

    const allowedEvents = [
      "tab_switch",
      "window_blur",
      "fullscreen_exit",
      "fullscreen_exit_esc",
      "copy",
      "paste",
      "cut",
      "right_click",
      "shortcut",
      "multiple_session",
      "screen_share_stopped",
      "webcam_stopped",
      "suspicious_extension",
    ];

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

    const penalties = {
      tab_switch: 5,
      window_blur: 5,
      fullscreen_exit: 4,
      fullscreen_exit_esc: 3,
      copy: 3,
      paste: 3,
      cut: 3,
      right_click: 2,
      shortcut: 3,
      multiple_session: 15,
      screen_share_stopped: 10,
      webcam_stopped: 10,
      suspicious_extension: 8,
    };

    const penalty = penalties[type] || 0;

    // Reduce integrity score
    session.integrityScore = Math.max(
      0,
      session.integrityScore - penalty
    );

    // Record the event
    session.events.push({
      type,
      metadata: metadata || {},
    });

    // Lock if integrity reaches 70 or below
    let lockedUntil = null;

    if (session.integrityScore <= 70) {
      lockedUntil = new Date(
        Date.now() + 1 * 60 * 60 * 1000
      );

      session.lockedUntil = lockedUntil;
    }

    // IMPORTANT:
    // Always save the updated score and event
    await session.save();

    return res.json({
      success: true,
      integrityScore: session.integrityScore,
      lockedUntil: session.lockedUntil || null,
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
          const penalty = 15;
          session.integrityScore = Math.max(0, session.integrityScore - penalty);
          session.events.push({
            type: "multiple_session",
            metadata: { tabToken },
          });

          if (session.integrityScore <= 70) {
            session.lockedUntil = new Date(Date.now() + 1 * 60 * 60 * 1000);
          }

          await session.save();

          return res.json({
            success: true,
            conflict: true,
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
};