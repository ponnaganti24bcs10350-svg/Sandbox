const express = require("express");

const {
  startAssessment,
  recordIntegrityEvent,
  submitAssessment,
  getAssessmentChallenge,
  getActiveAssessment,
} = require("../controllers/assessmentController");

const {
  protect,
  restrictTo,
} = require("../middleware/auth");

const router = express.Router();


router.post(
  "/start",
  protect,
  restrictTo("student"),
  startAssessment
);


router.post(
  "/:id/integrity",
  protect,
  restrictTo("student"),
  recordIntegrityEvent
);


router.post(
  "/:id/submit",
  protect,
  restrictTo("student"),
  submitAssessment
);
router.get(
  "/active",
  protect,
  restrictTo("student"),
  getActiveAssessment
);
router.get(
  "/:id/challenge",
  protect,
  restrictTo("student"),
  getAssessmentChallenge
);

module.exports = router;