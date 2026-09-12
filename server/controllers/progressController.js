const challenges = require("../challenges/challenges");
const User = require("../models/User");

// ------------------------------------
// GET RANDOM UNSOLVED CHALLENGE
// ------------------------------------

function getRandomUnsolvedChallenge(solvedIds) {
  const availableChallenges = challenges.filter(
    (challenge) =>
      !solvedIds.includes(challenge.challengeId)
  );

  if (availableChallenges.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(
    Math.random() * availableChallenges.length
  );

  return availableChallenges[randomIndex];
}

// ------------------------------------
// GET CURRENT CHALLENGE
// ------------------------------------

async function getCurrentChallenge(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const challengeId = req.query.challengeId;

    // If frontend already has a challenge,
    // return that exact challenge.
    if (challengeId) {
      const challenge = challenges.find(
        (item) =>
          item.challengeId === challengeId
      );

      if (challenge) {
        return res.json({
          success: true,
          data: challenge,
        });
      }
    }

    // Otherwise choose a new unsolved challenge.
    const challenge = getRandomUnsolvedChallenge(
      user.solvedChallenges || []
    );

    if (!challenge) {
      return res.json({
        success: false,
        message: "No unsolved challenges available.",
      });
    }

    return res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error(
      "Failed to get current challenge:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load challenge",
    });
  }
}

// ------------------------------------
// NEXT CHALLENGE
// ------------------------------------

async function getNextChallenge(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentChallengeId =
      req.query.challengeId;

    if (!currentChallengeId) {
      return res.status(400).json({
        success: false,
        message:
          "Current challenge ID is required.",
      });
    }

    const currentIndex =
      challenges.findIndex(
        (challenge) =>
          challenge.challengeId ===
          currentChallengeId
      );

    if (currentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Current challenge not found.",
      });
    }

    const solvedIds =
      user.solvedChallenges || [];

    // ------------------------------------
    // 1. LOOK FOR NEXT UNSOLVED CHALLENGE
    // ------------------------------------

    for (
      let i = currentIndex + 1;
      i < challenges.length;
      i++
    ) {
      const candidate = challenges[i];

      if (
        !solvedIds.includes(
          candidate.challengeId
        )
      ) {
        return res.json({
          success: true,
          data: candidate,
        });
      }
    }

    // ------------------------------------
    // 2. IF NOTHING AFTER CURRENT,
    //    LOOK FROM THE BEGINNING
    // ------------------------------------

    for (let i = 0; i < currentIndex; i++) {
      const candidate = challenges[i];

      if (
        !solvedIds.includes(
          candidate.challengeId
        )
      ) {
        return res.json({
          success: true,
          data: candidate,
        });
      }
    }

    // ------------------------------------
    // 3. EVERYTHING IS SOLVED
    // ------------------------------------

    return res.json({
      success: false,
      message:
        "No unsolved challenges available.",
    });
  } catch (error) {
    console.error(
      "Failed to get next challenge:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load next challenge",
    });
  }
}
// ------------------------------------
// PREVIOUS CHALLENGE
// ------------------------------------

async function getPreviousChallenge(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentChallengeId =
      req.query.challengeId;

    if (!currentChallengeId) {
      return res.status(400).json({
        success: false,
        message:
          "Current challenge ID is required.",
      });
    }

    const currentIndex =
      challenges.findIndex(
        (challenge) =>
          challenge.challengeId ===
          currentChallengeId
      );

    if (currentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Current challenge not found.",
      });
    }

    const solvedIds =
      user.solvedChallenges || [];

    // ------------------------------------
    // FIND PREVIOUS UNSOLVED CHALLENGE
    // ------------------------------------

    for (
      let i = currentIndex - 1;
      i >= 0;
      i--
    ) {
      const candidate = challenges[i];

      // Skip solved challenges
      if (
        solvedIds.includes(
          candidate.challengeId
        )
      ) {
        continue;
      }

      return res.json({
        success: true,
        data: candidate,
      });
    }

    // ------------------------------------
    // NO PREVIOUS UNSOLVED CHALLENGE
    // ------------------------------------

    return res.json({
      success: false,
      message:
        "No previous unsolved challenge available.",
    });
  } catch (error) {
    console.error(
      "Failed to get previous challenge:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load previous challenge",
    });
  }
}

// ------------------------------------
// PRACTICED CHALLENGES
// ------------------------------------

async function getPracticedChallenges(
  req,
  res
) {
  try {
    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const solvedIds =
      user.solvedChallenges || [];

    const practicedChallenges =
      challenges.filter((challenge) =>
        solvedIds.includes(
          challenge.challengeId
        )
      );

    return res.json({
      success: true,
      data: practicedChallenges,
    });
  } catch (error) {
    console.error(
      "Failed to get practiced challenges:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch practiced challenges",
    });
  }
}

// ------------------------------------
// EXPORTS
// ------------------------------------

module.exports = {
  getCurrentChallenge,
  getNextChallenge,
  getPreviousChallenge,
  getPracticedChallenges,
};