const express = require("express");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All progress routes need a logged-in user
router.use(protect);

// @route  GET /api/progress/today
// @desc   "Today's solved: 2 / 5" — call this on the dashboard
router.get("/today", async (req, res) => {
  if (req.user.resetDailyIfNeeded()) await req.user.save();
  return res.json({ success: true, progress: req.user.progressSummary() });
});

// @route  GET /api/progress/can-solve
// @desc   Quick check BEFORE opening a challenge:
//         Person 2 (challenges module) should call this before
//         letting the user start/submit a challenge.
router.get("/can-solve", async (req, res) => {
  if (req.user.resetDailyIfNeeded()) await req.user.save();
  const p = req.user.progressSummary();
  return res.json({ success: true, canSolve: !p.limitReached, progress: p });
});

// @route  POST /api/progress/solved
// @desc   Record ONE successful submission (2/5 -> 3/5).
//         Person 2 calls this after the test runner marks a
//         submission as PASSED. Returns 429 if limit reached.
router.post("/solved", async (req, res) => {
  try {
    req.user.recordSolve(); // throws 429 if limit reached
    await req.user.save();
    return res.json({
      success: true,
      message: `Recorded! Today's solved: ${req.user.solvedToday} / ${req.user.progressSummary().dailyLimit}`,
      progress: req.user.progressSummary(),
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({ success: false, message: err.message, progress: req.user.progressSummary() });
  }
});

module.exports = router;
