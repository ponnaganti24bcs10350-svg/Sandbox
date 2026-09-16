require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const challengeRoutes = require("./routes/challengeRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const progressRoutes = require("./routes/progressRoutes");
const invitationRoutes = require("./routes/invitationRoutes");

const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");

const app = express();

// Middleware
app.use(cors());

// Global Rate Limiting: Max 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});
app.use("/api", globalLimiter);

// Limit payload size to 1MB to prevent payload exhaustion attacks
app.use(express.json({ limit: "1mb" }));

// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

// Sanitize MongoDB operator injection from req.body, req.params, req.query
app.use(mongoSanitize());

// Set secure HTTP headers
app.use(helmet());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Sandbox backend is running",
  });
});

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/challenges", challengeRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.use("/api/progress", progressRoutes);

app.use("/api/invitations", invitationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `🚀 Sandbox server running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
  });