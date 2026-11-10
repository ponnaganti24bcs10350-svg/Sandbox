const { getChallengeById } = require("../challenges/catalog");
const { getChallengeRunner } = require("../challenges/runners");
const User = require("../models/User");
const AssessmentSession = require("../models/AssessmentSession");

async function runChallenge(req, res) {
  try {
    const { challengeId, files } = req.body;

    const userId = req.user._id;

    if (!challengeId || !files) {
      return res.status(400).json({
        passed: false,
        message: "challengeId and files are required",
      });
    }

    // ------------------------------------
    // REQUIRE ACTIVE ASSESSMENT SESSION
    // ------------------------------------

    const activeSession = await AssessmentSession.findOne({
      candidate: userId,
      challenge: challengeId,
      status: "active",
    });

    if (!activeSession) {
      return res.status(403).json({
        passed: false,
        message: "No active assessment session for this challenge.",
      });
    }

    // ------------------------------------
    // FIND CHALLENGE
    // ------------------------------------

    const challenge = getChallengeById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        passed: false,
        message: "Challenge not found",
      });
    }

    // ------------------------------------
    // RUN TESTS
    // ------------------------------------

    const runner = getChallengeRunner(challengeId);

    if (!runner) {
      return res.json({
        passed: false,
        testsPassed: 0,
        totalTests: 0,
        message: "Tests for this challenge are not available yet.",
      });
    }

    const result = await runner(files);

    let newlySolved = false;
    let updatedUser = null;

    // ------------------------------------
    // UPDATE ONLY IF PASSED
    // ------------------------------------

    if (result.passed) {
      const today = User.todayIST();
      const dailyLimit = User.DAILY_LIMIT;

      const scoreIncrease = 5;

      // ------------------------------------
      // ATOMIC SOLVE UPDATE
      // Prevents concurrent requests from
      // bypassing the daily limit or
      // recording the same challenge twice.
      // ------------------------------------

      updatedUser = await User.findOneAndUpdate(
        {
          _id: userId,

          // Challenge must not already be solved.
          solvedChallenges: {
            $ne: challengeId,
          },

          // Either this is a new day,
          // or the user still has daily solves left.
          $or: [
            {
              lastSolvedDate: {
                $ne: today,
              },
            },
            {
              lastSolvedDate: today,
              solvedToday: {
                $lt: dailyLimit,
              },
            },
          ],
        },
        [
          {
            $set: {
              solvedToday: {
                $cond: [
                  {
                    $ne: ["$lastSolvedDate", today],
                  },
                  1,
                  {
                    $add: ["$solvedToday", 1],
                  },
                ],
              },

              lastSolvedDate: today,

              lastChallengeSolvedAt: new Date(),

              totalSolved: {
                $add: ["$totalSolved", 1],
              },

              solvedChallenges: {
                $setUnion: [
                  "$solvedChallenges",
                  [challengeId],
                ],
              },

              javascriptScore: {
                $min: [
                  100,
                  {
                    $add: [
                      "$javascriptScore",
                      scoreIncrease,
                    ],
                  },
                ],
              },
            },
          },
        ],
        {
          new: true,
          updatePipeline: true,
        }
      );

      // ------------------------------------
      // ATOMIC UPDATE FAILED
      // ------------------------------------

      if (!updatedUser) {
        const currentUser = await User.findById(userId);

        if (!currentUser) {
          return res.status(404).json({
            passed: false,
            message: "User not found",
          });
        }

        // Another request may have solved
        // this challenge at the same time.
        if (
          currentUser.solvedChallenges.includes(
            challengeId
          )
        ) {
          return res.json({
            ...result,
            newlySolved: false,
            progress: currentUser.progressSummary(),
          });
        }

        // Daily limit reached.
        return res.status(429).json({
          passed: false,
          message: `Daily limit of ${dailyLimit} challenges reached. Come back tomorrow!`,
          progress: currentUser.progressSummary(),
        });
      }

      newlySolved = true;

      console.log(
        `New challenge solved: ${challengeId} by ${updatedUser.email}`
      );
    }

    // ------------------------------------
    // RESPONSE
    // ------------------------------------
const candidateResult = {
  passed: result.passed,
  testsPassed: result.testsPassed,
  totalTests: result.totalTests,

  message: result.passed
    ? "Challenge solved successfully."
    : "Tests failed. Review the affected areas and investigate the relevant application flow.",

  failureAreas:
    !result.passed && Array.isArray(result.failureAreas)
      ? result.failureAreas
      : [],
};

return res.json({
  ...candidateResult,
  newlySolved,
  progress: updatedUser
    ? updatedUser.progressSummary()
    : null,
});
  } catch (error) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
      passed: false,
      message: error.message || "Failed to run challenge",
    });
  }
}

module.exports = {
  runChallenge,
};