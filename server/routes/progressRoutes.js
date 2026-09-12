const express = require("express");

const { protect } = require("../middleware/auth");

const {
  getCurrentChallenge,
  getNextChallenge,
  getPreviousChallenge,
  getPracticedChallenges,
} = require("../controllers/progressController");

const router = express.Router();

// All progress routes require login
router.use(protect);

// ------------------------------------
// DAILY PROGRESS
// ------------------------------------

router.get("/today", async (req, res) => {
  try {
    if (req.user.resetDailyIfNeeded()) {
      await req.user.save();
    }

    return res.json({
      success: true,
      progress: req.user.progressSummary(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get today's progress",
    });
  }
});

// ------------------------------------
// CAN SOLVE
// ------------------------------------

router.get("/can-solve", async (req, res) => {
  try {
    if (req.user.resetDailyIfNeeded()) {
      await req.user.save();
    }

    const progress =
      req.user.progressSummary();

    return res.json({
      success: true,
      canSolve: !progress.limitReached,
      progress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check progress",
    });
  }
});

// ------------------------------------
// CURRENT
// ------------------------------------

router.get(
  "/current",
  getCurrentChallenge
);

// ------------------------------------
// NEXT
// ------------------------------------

router.get(
  "/next",
  getNextChallenge
);

// ------------------------------------
// PREVIOUS
// ------------------------------------

router.get(
  "/previous",
  getPreviousChallenge
);

// ------------------------------------
// PRACTICED
// ------------------------------------

router.get(
  "/practiced",
  getPracticedChallenges
);

module.exports = router;