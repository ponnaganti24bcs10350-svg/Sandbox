const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect middleware.
 * Expects header:  Authorization: Bearer <token>
 * Attaches the full user document to req.user.
 *
 * Teammates: import this and put it in front of any route
 * that needs a logged-in user, e.g.
 *   router.post("/submit", protect, submitHandler)
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Not authorized: no token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized: invalid or expired token" });
  }
};

/** Optional: restrict a route to certain roles, e.g. adminOnly */
const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You don't have permission for this" });
    }
    next();
  };

module.exports = { protect, restrictTo };
