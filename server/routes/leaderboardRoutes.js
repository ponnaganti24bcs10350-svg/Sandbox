const express = require("express");

const {
  getLeaderboard,
  updateUserScore,
} = require("../controllers/leaderboardController");

const {
  protect,
  restrictTo,
} = require("../middleware/auth");

const router = express.Router();

// Public developer leaderboard
router.get("/", getLeaderboard);

// Score updates are restricted to admins
router.post(
  "/update",
  protect,
  restrictTo("admin"),
  updateUserScore
);

module.exports = router;