const challenges = require("../challenges/challenges");
const User = require("../models/User");

// ------------------------------------
// IN-MEMORY NAVIGATION HISTORY
// ------------------------------------

const userProgress = {};

function getUserProgress(userId) {
  if (!userProgress[userId]) {
    userProgress[userId] = {
      history: [],
      currentIndex: -1,
    };
  }

  return userProgress[userId];
}

// ------------------------------------
// GET RANDOM UNSOLVED CHALLENGE
// ------------------------------------

function getRandomUnsolvedChallenge(
  solvedIds,
  history
) {
  let availableChallenges = challenges.filter(
    (challenge) =>
      !solvedIds.includes(challenge.challengeId) &&
      !history.includes(challenge.challengeId)
  );

  // Fallback: If all unsolved challenges have been visited in history, allow any unsolved challenge
  if (availableChallenges.length === 0) {
    availableChallenges = challenges.filter(
      (challenge) => !solvedIds.includes(challenge.challengeId)
    );
  }

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
    const userId = req.user._id.toString();

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const progress = getUserProgress(userId);

    // Return existing current challenge if valid
    if (progress.currentIndex >= 0) {
      const challengeId =
        progress.history[progress.currentIndex];

      const challenge = challenges.find(
        (item) =>
          item.challengeId === challengeId
      );

      if (
        challenge &&
        !user.solvedChallenges.includes(challengeId)
      ) {
        return res.json({
          success: true,
          data: challenge,
        });
      }
    }

    // Get new unsolved challenge
    const challenge = getRandomUnsolvedChallenge(
      user.solvedChallenges || [],
      progress.history
    );

    if (!challenge) {
      return res.json({
        success: false,
        message: "No unsolved challenges available.",
      });
    }

    progress.history.push(challenge.challengeId);

    progress.currentIndex =
      progress.history.length - 1;

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
    const userId = req.user._id.toString();

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const progress = getUserProgress(userId);

    // ------------------------------------
    // CHECK FOR NEXT ITEM IN HISTORY
    // ------------------------------------

    let nextIndex =
      progress.currentIndex + 1;

    while (
      nextIndex < progress.history.length
    ) {
      const challengeId =
        progress.history[nextIndex];

      // Skip challenges that are solved
      if (
        !user.solvedChallenges.includes(
          challengeId
        )
      ) {
        const challenge = challenges.find(
          (item) =>
            item.challengeId === challengeId
        );

        if (challenge) {
          progress.currentIndex = nextIndex;

          return res.json({
            success: true,
            data: challenge,
          });
        }
      }

      nextIndex++;
    }

    // ------------------------------------
    // GET A BRAND NEW CHALLENGE
    // ------------------------------------

    const challenge = getRandomUnsolvedChallenge(
      user.solvedChallenges || [],
      progress.history
    );

    if (!challenge) {
      return res.json({
        success: false,
        message:
          "No more unsolved challenges available.",
      });
    }

    progress.history.push(challenge.challengeId);

    progress.currentIndex =
      progress.history.length - 1;

    return res.json({
      success: true,
      data: challenge,
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
    const userId = req.user._id.toString();

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const progress = getUserProgress(userId);

    // Start checking behind current position
    let previousIndex =
      progress.currentIndex - 1;

    while (previousIndex >= 0) {
      const challengeId =
        progress.history[previousIndex];

      // Skip solved challenges
      if (
        !user.solvedChallenges.includes(
          challengeId
        )
      ) {
        const challenge = challenges.find(
          (item) =>
            item.challengeId === challengeId
        );

        if (challenge) {
          progress.currentIndex =
            previousIndex;

          return res.json({
            success: true,
            data: challenge,
          });
        }
      }

      previousIndex--;
    }

    return res.json({
      success: false,
      message:
        "No previous challenge available.",
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

async function getPracticedChallenges(req, res) {
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

module.exports = {
  getCurrentChallenge,
  getNextChallenge,
  getPreviousChallenge,
  getPracticedChallenges,
};