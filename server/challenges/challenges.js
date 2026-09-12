const challenges = [
  {
    challengeId: "1",

    title: "Fix Broken Login",

    description:
      "Users are unable to log in to the application. Investigate the MERN project and fix the login route.",
    requirements: [
      "Inspect the relevant files.",
      "Fix the login functionality.",
      "Do not change unrelated code.",
      "Click Run to test your solution.",
    ],

    files: {
      "client/src/Login.jsx": `function Login() {
  return <h1>Login Page</h1>;
}

export default Login;
`,

      "server/controllers/authController.js": `const login = (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  res.json({
    message: "Login successful"
  });
};

module.exports = { login };
`,

      "server/routes/authRoutes.js": `const express = require("express");

const router = express.Router();

// BUG: Login route is missing

module.exports = router;
`,
    },
  },

  {
    challengeId: "2",

    title: "Fix JWT Authentication Middleware",

    description:
      "The protected profile endpoint is not correctly handling JWT authentication. Fix the middleware.",

    requirements: [
      "Check the authentication middleware.",
      "Handle missing tokens.",
      "Handle invalid tokens.",
      "Allow requests with valid tokens.",
    ],

    files: {
      "server/middleware/authMiddleware.js": `const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.headers.authorization;

  // BUG: token handling is incomplete

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  req.user = decoded;

  next();
};

module.exports = protect;
`,

      "server/controllers/userController.js": `const getProfile = (req, res) => {
  res.json({
    message: "Protected profile data",
    user: req.user,
  });
};

module.exports = { getProfile };
`,

      "server/routes/userRoutes.js": `const express = require("express");
const { getProfile } = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", protect, getProfile);

module.exports = router;
`,
    },
  },

  {
    challengeId: "3",

    title: "Fix the API Endpoint",

    description:
      "The frontend is trying to fetch users, but the API returns a 404 error. Find and fix the incorrect route.",

    requirements: [
      "Inspect the frontend API request.",
      "Inspect the Express route.",
      "Fix the incorrect endpoint.",
      "Do not change unrelated code.",
    ],

    files: {
      "client/src/Users.jsx": `async function getUsers() {
  const response = await fetch("/api/users");

  const data = await response.json();

  return data;
}

export default getUsers;
`,

      "server/controllers/userController.js": `const getUsers = (req, res) => {
  res.json([
    {
      id: 1,
      name: "Student One"
    },
    {
      id: 2,
      name: "Student Two"
    }
  ]);
};

module.exports = { getUsers };
`,

      "server/routes/userRoutes.js": `const express = require("express");
const { getUsers } = require("../controllers/userController");

const router = express.Router();

// BUG: incorrect endpoint
router.get("/user", getUsers);

module.exports = router;
`,

      "server/server.js": `const express = require("express");

const app = express();

app.use(express.json());

const userRoutes = require("./routes/userRoutes");

app.use("/api/users", userRoutes);

module.exports = app;
`,
    },
  },
];

module.exports = challenges;