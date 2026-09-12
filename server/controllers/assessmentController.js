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
  status: session.status
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
      "copy",
      "paste",
      "cut",
      "right_click",
      "shortcut",
      "multiple_session",
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
      window_blur: 2,
      fullscreen_exit: 5,
      copy: 5,
      paste: 5,
      cut: 5,
      right_click: 2,
      shortcut: 3,
      multiple_session: 15,
    };

    const penalty = penalties[type] || 0;

    session.integrityScore = Math.max(
      0,
      session.integrityScore - penalty
    );

    session.events.push({
      type,
      metadata: metadata || {},
    });

    await session.save();

    return res.json({
      success: true,
      integrityScore: session.integrityScore,
    });
  } catch (error) {
    console.error("Record integrity event error:", error);

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

const getActiveAssessment = async (req, res) => {
  try {
    const session = await AssessmentSession.findOne({
      candidate: req.user._id,
      status: "active",
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.json({
        success: true,
        active: false,
      });
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
      },
    });
  } catch (error) {
    console.error("Get active assessment error:", error);

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
};