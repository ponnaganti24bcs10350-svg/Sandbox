const express = require("express");

const {
  listChallenges,
  listCategories,
} = require("../challenges/catalog");

const {
  runChallenge,
} = require("../controllers/challengeController");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/categories", (req, res) => {
  res.json({
    success: true,
    data: listCategories(),
  });
});

router.get("/", protect, (req, res) => {
  const { category } = req.query;

  res.json({
    success: true,
    data: listChallenges({ category }).map(({ files, ...challenge }) => challenge),
  });
});

router.get("/random", protect, (req, res) => {
  const randomIndex = Math.floor(
    Math.random() * listChallenges({ category: req.query.category }).length
  );

  const challenges = listChallenges({ category: req.query.category });
  const challenge = challenges[randomIndex];

  if (!challenge) {
    return res.status(404).json({
      success: false,
      message: "No challenges found for this category",
    });
  }

  const { challengeId, title, level, category } = challenge;

  // Only expose safe metadata — full content (files, requirements)
  // is gated behind an active assessment session via assessmentController.
  res.json({ challengeId, title, level, category });
});

router.post(
  "/run",
  protect,
  runChallenge
);

module.exports = router;