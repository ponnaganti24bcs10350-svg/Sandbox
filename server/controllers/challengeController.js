const challenges = require("../challenges/challenges");
const User = require("../models/User");

const testChallenge1 = require("../tests/challenge1.test");
const testChallenge2 = require("../tests/challenge2.test");
const testChallenge3 = require("../tests/challenge3.test");

async function runChallenge(req, res) {
  try {
    const {
      challengeId,
      files,
    } = req.body;

    const userId = req.user._id;

    if (!challengeId || !files) {
      return res.status(400).json({
        passed: false,
        message:
          "challengeId and files are required",
      });
    }

    const challenge = challenges.find(
      (item) =>
        item.challengeId === challengeId
    );

    if (!challenge) {
      return res.status(404).json({
        passed: false,
        message: "Challenge not found",
      });
    }

    let result;

    if (challengeId === "1") {
      result = testChallenge1(files);
    } else if (challengeId === "2") {
      result = testChallenge2(files);
    } else if (challengeId === "3") {
      result = testChallenge3(files);
    } else {
      return res.json({
        passed: false,
        testsPassed: 0,
        totalTests: 0,
        message:
          "Tests for this challenge are not available yet.",
      });
    }

    let newlySolved = false;
    let updatedUser = null;

    // ------------------------------------
    // UPDATE ONLY IF PASSED
    // ------------------------------------

    if (result.passed) {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          passed: false,
          message: "User not found",
        });
      }

      const alreadySolved =
        user.solvedChallenges.includes(
          challengeId
        );

      // ------------------------------------
      // ONLY COUNT NEW SOLVES
      // ------------------------------------

      if (!alreadySolved) {
        // This also enforces the daily limit.
        user.recordSolve();

        user.solvedChallenges.push(
          challengeId
        );

        // ------------------------------------
        // SCORE UPDATE
        // ------------------------------------

        // These first challenges are
        // primarily JavaScript/backend
        // engineering challenges.
        if (
          challengeId === "1" ||
          challengeId === "2" ||
          challengeId === "3"
        ) {
          user.javascriptScore =
            Math.min(
              100,
              user.javascriptScore + 5
            );
        }

        await user.save();

        newlySolved = true;
        updatedUser = user;

        console.log(
          `New challenge solved: ${challengeId} by ${user.email}`
        );
      }
    }

    return res.json({
      ...result,

      newlySolved,

      progress: updatedUser
        ? updatedUser.progressSummary()
        : null,
    });
  } catch (error) {
    console.error(error);

    return res.status(
      error.statusCode || 500
    ).json({
      passed: false,
      message:
        error.message ||
        "Failed to run challenge",
    });
  }
}

module.exports = {
  runChallenge,
};