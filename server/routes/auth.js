const express = require("express");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const VerificationCode = require("../models/VerificationCode");
const { sendVerificationEmail } = require("../services/emailService");
const { protect } = require("../middleware/auth");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

const verificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification requests. Please try again later.",
  },
});
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
  javascriptScore: user.javascriptScore,
  reactScore: user.reactScore,
  progress: user.progressSummary(),
});

// @route  POST /api/auth/send-verification
// @body   { email }
router.post("/send-verification", verificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if account already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

   const code = crypto.randomInt(100000, 1000000).toString();
    // Remove older codes for this email
    await VerificationCode.deleteMany({ email: normalizedEmail });

    // Save new code
    await VerificationCode.create({ email: normalizedEmail, code });

    // Respond immediately so the user doesn't wait
    res.json({ success: true, message: "Verification code sent to your email" });

    // Send email in background (non-blocking) with a 12s timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email send timeout")), 12000)
    );

    Promise.race([sendVerificationEmail({ email: normalizedEmail, code }), timeout])
      .then(() => console.log(`Verification email sent to ${normalizedEmail}`))
      .catch((emailErr) => {
        console.warn("Email delivery warning (non-blocking):", emailErr.message);
      });

  } catch (err) {
    console.error("Error in send-verification:", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message || "Failed to send verification code" });
    }
  }
});

// @route  POST /api/auth/verify-code
// @body   { email, code, name, password, role }
router.post("/verify-code", verificationLimiter, async (req, res) => {
  try {
    const { email, code, name, password, role } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and verification code are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = await VerificationCode.findOne({ email: normalizedEmail, code: code.trim() });

    if (!record) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    // Code is valid - delete it so it can't be reused
    await VerificationCode.deleteMany({ email: normalizedEmail });

    // Find or create user
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      if (!name || !password) {
        return res.status(400).json({ success: false, message: "Name and password are required to complete registration" });
      }
      user = await User.create({
        name,
        email: normalizedEmail,
        password,
        role: role === "company" ? "company" : "student",
      });
    }

    user.resetDailyIfNeeded();
    await user.save();

    return res.status(201).json({
      success: true,
      token: signToken(user._id),
      user: userResponse(user),
    });
  } catch (err) {
    console.error("Error verifying code:", err);
    return res.status(500).json({ success: false, message: "Server error during verification" });
  }
});

// @route  POST /api/auth/signup
// @body   { name, email, password }
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const user = await User.create({ name, email, password,role:role=== "company" ? "company" : "student" });
    user.resetDailyIfNeeded();
    await user.save();

    return res.status(201).json({
      success: true,
      token: signToken(user._id),
      user: userResponse(user),
    });
  } catch (err) {
    // Mongoose validation errors
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors)[0].message;
      return res.status(400).json({ success: false, message: msg });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error during signup" });
  }
});

// @route  POST /api/auth/login
// @body   { email, password }
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Lazy daily reset on login so the dashboard shows fresh numbers
    if (user.resetDailyIfNeeded()) await user.save();

    return res.json({
      success: true,
      token: signToken(user._id),
      user: userResponse(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// @route  POST /api/auth/google
// @body   { credential, email, name, picture, googleId }
router.post("/google", async (req, res) => {
  try {
    const { credential, email: bodyEmail, name: bodyName, picture: bodyPicture, googleId: bodyGoogleId } = req.body;
    if (!credential) {
  return res.status(400).json({
    success: false,
    message: "Google credential is required",
  });
}
    let email = bodyEmail;
    let name = bodyName;
    let picture = bodyPicture;
    let googleId = bodyGoogleId;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
       const payload = ticket.getPayload();

if (!payload.email_verified) {
  return res.status(401).json({
    success: false,
    message: "Google email is not verified",
  });
}

email = payload.email;
name = payload.name;
picture = payload.picture;
googleId = payload.sub;
      } catch (verifyErr) {
  return res.status(401).json({
    success: false,
    message: "Invalid Google credential",
  });
}
    }

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required for Google authentication" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: randomPassword,
        googleId: googleId || null,
        avatar: picture || null,
        role: "student",
      });
    } else {
      let updated = false;
      if (googleId && !user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    if (user.resetDailyIfNeeded()) await user.save();

    return res.json({
      success: true,
      token: signToken(user._id),
      user: userResponse(user),
    });
  } catch (err) {
    console.error("Google Auth Error:", err);
    return res.status(500).json({ success: false, message: "Server error during Google authentication" });
  }
});

// @route  GET /api/auth/me
// @desc   Current logged-in user (for session restore on page refresh)
router.get("/me", protect, async (req, res) => {
  if (req.user.resetDailyIfNeeded()) await req.user.save();
  return res.json({ success: true, user: userResponse(req.user) });
});

module.exports = router;
