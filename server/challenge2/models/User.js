const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Challenge2User", userSchema);