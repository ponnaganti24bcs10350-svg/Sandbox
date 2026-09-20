const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["published", "draft"],
      default: "published",
      index: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Challenge2Post", postSchema);