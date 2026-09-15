const User = require("../models/User");

// GET LEADERBOARD
// Only student accounts appear on the developer leaderboard.
async function getLeaderboard(req, res) {
  try {
    const users = await User.find({
      role: "student",
    })
      .select(
        "name javascriptScore reactScore totalSolved"
      )
      .lean();

    const sortedUsers = users.sort((a, b) => {
      const aOverall =
        (a.javascriptScore + a.reactScore) / 2;

      const bOverall =
        (b.javascriptScore + b.reactScore) / 2;

      return bOverall - aOverall;
    });

    const rankedUsers = sortedUsers.map(
      (user, index) => {
        const overallScore = Math.round(
          (user.javascriptScore +
            user.reactScore) /
            2
        );

        return {
          rank: index + 1,

          userId: user._id.toString(),

          username: user.name,

          javascriptScore:
            user.javascriptScore,

          reactScore:
            user.reactScore,

          totalSolved:
            user.totalSolved,

          overallScore,
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