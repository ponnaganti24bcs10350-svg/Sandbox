require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const challengeRoutes = require("./routes/challengeRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const progressRoutes = require("./routes/progressRoutes");
const invitationRoutes = require("./routes/invitationRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Sandbox backend is running",
  });
});

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/challenges", challengeRoutes);

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