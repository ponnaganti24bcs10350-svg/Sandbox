const mongoose = require("mongoose");

const assessmentSessionSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    challenge: {
      type: String,
      required: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "submitted"],
      default: "active",
    },

    integrityScore: {
      type: Number,
      default: 100,
    },

    events: [
      {
        type: {
          type: String,
          enum: [
            "tab_switch",
            "fullscreen_exit",
            "copy",
            "paste",
            "cut",
            "right_click",
            "shortcut",
            "window_blur",
            "multiple_session",
          ],
        },

        timestamp: {
          type: Date,
          default: Date.now,
        },

        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
  },
   {
    timestamps: true,
  }
);

assessmentSessionSchema.index(
  { candidate: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
  }
);

module.exports = mongoose.model(
  "AssessmentSession",
  assessmentSessionSchema
);