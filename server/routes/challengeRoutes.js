const express = require("express");

const challenges = require("../challenges/challenges");

const {
  runChallenge,
} = require("../controllers/challengeController");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/random", (req, res) => {
  const randomIndex = Math.floor(
    Math.random() * challenges.length
  );

  const randomChallenge =
    challenges[randomIndex];

  res.json(randomChallenge);
});

router.post(
  "/run",
  protect,
  runChallenge
);

module.exports = router;