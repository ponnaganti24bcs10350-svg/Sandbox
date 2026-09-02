const Invitation = require("../models/Invitation");
const User = require("../models/User");
const { sendInvitationEmail } = require("../services/emailService");

// Company sends an invitation to a candidate
const createInvitation = async (req, res) => {
  try {
    const { candidateId, position, message } = req.body;

    if (!candidateId || !position) {
      return res.status(400).json({
        success: false,
        message: "Candidate and position are required",
      });
    }

    // Find candidate
    const candidate = await User.findById(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    // Only students can receive company invitations
    if (candidate.role !== "student") {
      return res.status(400).json({
        success: false,
        message: "You can only invite student candidates",
      });
    }

    // Don't allow duplicate pending invitations
    const existingInvitation = await Invitation.findOne({
      company: req.user._id,
      candidate: candidate._id,
      status: "pending",
    });

    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending invitation for this candidate",
      });
    }

    // Create invitation
    const invitation = await Invitation.create({
      company: req.user._id,
      candidate: candidate._id,
      candidateEmail: candidate.email,
      position,
      message: message || "",
    });

    try {
      // Send email to candidate's registered Sandbox email
      await sendInvitationEmail({
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        companyName: req.user.name,
        challengeTitle: position,
      });
    } catch (emailError) {
      // Remove invitation if email could not be sent
      await Invitation.findByIdAndDelete(invitation._id);

      return res.status(502).json({
        success: false,
        message: "Invitation could not be sent. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      invitation,
    });
  } catch (error) {
    console.error("Create invitation error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating invitation",
    });
  }
};


// Get invitations sent by the company
const getCompanyInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      company: req.user._id,
    })
      .populate("candidate", "name email javascriptScore reactScore")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error("Get company invitations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invitations",
    });
  }
};


// Get invitations received by the candidate
const getCandidateInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      candidate: req.user._id,
    })
      .populate("company", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error("Get candidate invitations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invitations",
    });
  }
};


// Candidate accepts or declines an invitation
const respondToInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation response",
      });
    }

    const invitation = await Invitation.findOne({
      _id: id,
      candidate: req.user._id,
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This invitation has already been responded to",
      });
    }

    invitation.status = status;
    invitation.respondedAt = new Date();

    await invitation.save();

    return res.json({
      success: true,
      message:
        status === "accepted"
          ? "Invitation accepted"
          : "Invitation declined",
      invitation,
    });
  } catch (error) {
    console.error("Respond to invitation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to respond to invitation",
    });
  }
};


module.exports = {
  createInvitation,
  getCompanyInvitations,
  getCandidateInvitations,
  respondToInvitation,
};