const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    files: {
      type: Map,
      of: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Challenge", challengeSchema);