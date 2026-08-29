require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const progressRoutes = require("./routes/progress");

const app = express();

// Middleware
app.use(cors()); // allow the React frontend (localhost:3000 / 5173) to call us
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);

// Health check (useful when combining modules + for deployment)
app.get("/api/health", (req, res) => res.json({ ok: true, module: "user-system" }));

// 404 for unknown API routes
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 User System running on http://localhost:${PORT}`));
});
