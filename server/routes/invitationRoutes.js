const express = require("express");

const {
  createInvitation,
  getCompanyInvitations,
  getCandidateInvitations,
  respondToInvitation,
} = require("../controllers/invitationController");

const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

// Company → send invitation
router.post(
  "/",
  protect,
  restrictTo("company"),
  createInvitation
);

// Company → see invitations they sent
router.get(
  "/company",
  protect,
  restrictTo("company"),
  getCompanyInvitations
);

// Student → see invitations they received
router.get(
  "/candidate",
  protect,
  restrictTo("student"),
  getCandidateInvitations
);

// Student → accept / decline
router.patch(
  "/:id/respond",
  protect,
  restrictTo("student"),
  respondToInvitation
);

module.exports = router;