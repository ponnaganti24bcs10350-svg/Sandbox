const express = require("express");

const challenges = require("../challenges/challenges");

const {
  runChallenge,
} = require("../controllers/challengeController");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/random", protect, (req, res) => {
  const randomIndex = Math.floor(
    Math.random() * challenges.length
  );

  const { challengeId, title, difficulty } =
    challenges[randomIndex];

  // Only expose safe metadata — full content (files, requirements)
  // is gated behind an active assessment session via assessmentController.
  res.json({ challengeId, title, difficulty });
});

router.post(
  "/run",
  protect,
  runChallenge
);

module.exports = router;