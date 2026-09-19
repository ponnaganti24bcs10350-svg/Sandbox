const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || "5", 10);

function todayIST() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
     match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "company", "admin"],
      default: "student",
    },

    // Daily progress
    solvedToday: {
      type: Number,
      default: 0,
    },

    lastSolvedDate: {
      type: String,
      default: null,
    },

    lastChallengeSolvedAt: {
      type: Date,
      default: null,
    },

    totalSolved: {
      type: Number,
      default: 0,
    },

    /*
     * Single-active-tab enforcement.
     *
     * Whichever browser tab/window last sent a heartbeat "owns" the
     * active assessment. If a second tab (same browser or a different
     * browser entirely, e.g. Chrome + Firefox) sends a heartbeat while
     * the owner's heartbeat is still recent, that's a concurrent
     * session and gets flagged as a "multiple_session" integrity event.
     */
    activeTabToken: {
      type: String,
      default: null,
    },

    activeTabHeartbeatAt: {
      type: Date,
      default: null,
    },

    // Challenges solved by this user
    solvedChallenges: {
      type: [String],
      default: [],
    },

    // Leaderboard scores
    javascriptScore: {
      type: Number,
      default: 0,
    },

    reactScore: {
      type: Number,
      default: 0,
    },

    googleId: {
      type: String,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    barredUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Reset daily counter if needed
userSchema.methods.resetDailyIfNeeded = function () {
  const today = todayIST();

  if (this.lastSolvedDate !== today) {
    this.solvedToday = 0;
    this.lastSolvedDate = today;

    return true;
  }

  return false;
};

// Record successful challenge
userSchema.methods.recordSolve = function () {
  this.resetDailyIfNeeded();

  if (this.solvedToday >= DAILY_LIMIT) {
    const error = new Error(
      `Daily limit of ${DAILY_LIMIT} challenges reached. Come back tomorrow!`
    );

    error.statusCode = 429;

    throw error;
  }

  this.solvedToday += 1;
  this.totalSolved += 1;
};

// Progress information
userSchema.methods.progressSummary = function () {
  return {
    solvedToday: this.solvedToday,
    dailyLimit: DAILY_LIMIT,
    remainingToday: Math.max(
      0,
      DAILY_LIMIT - this.solvedToday
    ),
    limitReached: this.solvedToday >= DAILY_LIMIT,
    totalSolved: this.totalSolved,
    date: todayIST(),
  };
};

module.exports = mongoose.model("User", userSchema);

module.exports.DAILY_LIMIT = DAILY_LIMIT;
module.exports.todayIST = todayIST;