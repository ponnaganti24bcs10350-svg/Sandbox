const User = require("../models/User");
const challenges = require("../challenges/challenges");

// GET LEADERBOARD
// Only student accounts appear on the developer leaderboard.
async function getLeaderboard(req, res) {
  try {
    const totalChallenges = challenges.length;

    const users = await User.find({
      role: "student",
    })
      .select(
        "name totalSolved lastChallengeSolvedAt"
      )
      .lean();

    const sortedUsers = users.sort((a, b) => {
      if (b.totalSolved !== a.totalSolved) {
        return b.totalSolved - a.totalSolved;
      }
      
      const aTime = a.lastChallengeSolvedAt ? new Date(a.lastChallengeSolvedAt).getTime() : Infinity;
      const bTime = b.lastChallengeSolvedAt ? new Date(b.lastChallengeSolvedAt).getTime() : Infinity;
      
      return aTime - bTime;
    });

    const rankedUsers = sortedUsers.map(
      (user, index) => {
        const mernScore = totalChallenges > 0 
          ? Math.min(Math.round((user.totalSolved / totalChallenges) * 100), 100)
          : 0;

        return {
          rank: index + 1,
          userId: user._id.toString(),
          username: user.name,
          mernScore,
          totalSolved: user.totalSolved,
        };
      }
    );

    return res.json({
      success: true,
      data: rankedUsers,
    });
  } catch (error) {
    console.error(
      "Failed to fetch leaderboard:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
    });
  }
}

// MANUAL UPDATE
// Kept for future admin functionality.
// Do not expose this endpoint publicly.
async function updateUserScore(req, res) {
  try {
    const {
      userId,
      javascriptScore,
      reactScore,
    } = req.body;

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      javascriptScore !== undefined
    ) {
      user.javascriptScore =
        javascriptScore;
    }

    if (reactScore !== undefined) {
      user.reactScore = reactScore;
    }

    await user.save();

    return res.json({
      success: true,
      message:
        "Score updated successfully",

      data: {
        userId: user._id.toString(),

        username: user.name,

        javascriptScore:
          user.javascriptScore,

        reactScore:
          user.reactScore,

        totalSolved:
          user.totalSolved,

        overallScore: Math.round(
          (user.javascriptScore +
            user.reactScore) /
            2
        ),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update score",
    });
  }
}

module.exports = {
  getLeaderboard,
  updateUserScore,
};