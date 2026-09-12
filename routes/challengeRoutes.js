const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const challenges = [
  {
    challengeId: "1",
    title: "Fix Broken Login",
    description:
      "Users are unable to log in to the application. Investigate the MERN project and find the bug.",
    requirements: [
      "Inspect the relevant files.",
      "Fix the login functionality.",
      "Do not change unrelated code.",
      "Click Run to test your solution.",
    ],
    files: {
      "client/src/Login.jsx":
        "function Login() {\n  return <h1>Login Page</h1>;\n}\n\nexport default Login;\n",
      "server/controllers/authController.js":
        "const login = (req, res) => {\n  // Login logic here\n};\n\nmodule.exports = { login };\n",
      "server/routes/authRoutes.js":
        'const express = require("express");\n\nconst router = express.Router();\n\nmodule.exports = router;\n',
    },
  },
  {
    challengeId: "2",
    title: "Fix JWT Authentication Middleware",
    description:
      "A protected route should only allow authenticated users, but the JWT middleware is broken.",
    requirements: [
      "Inspect the middleware file.",
      "Extract the Bearer token correctly from headers.",
      "Handle missing or invalid tokens by returning a 401 status code.",
      "Call next() only when the token is valid.",
    ],
    files: {
      "server/middleware/authMiddleware.js":
        'const jwt = require("jsonwebtoken");\n\nconst protect = (req, res, next) => {\n  const token = req.headers.authorization;\n\n  const decoded = jwt.verify(token, process.env.JWT_SECRET);\n\n  req.user = decoded;\n\n  next();\n};\n\nmodule.exports = protect;\n',
      "server/routes/userRoutes.js":
        'const express = require("express");\nconst router = express.Router();\nconst protect = require("../middleware/authMiddleware");\nconst { getProfile } = require("../controllers/userController");\n\nrouter.get("/profile", protect, getProfile);\n\nmodule.exports = router;\n',
      "server/controllers/userController.js":
        "const getProfile = (req, res) => {\n  res.json({ message: 'User profile loaded', user: req.user });\n};\n\nmodule.exports = { getProfile };\n",
    },
  },
  {
    challengeId: "3",
    title: "Fix the API Endpoint",
    description:
      "The frontend tries to fetch users from /api/users, but receives a 404 error because the backend route path is wrong.",
    requirements: [
      "Inspect server.js and userRoutes.js.",
      "Identify the incorrect endpoint path in userRoutes.js.",
      "Update the route path from '/user' to '/' so it matches the route mounted at '/api/users'.",
    ],
    files: {
      "client/src/Users.jsx":
        'import { useEffect, useState } from "react";\n\nexport default function Users() {\n  const [users, setUsers] = useState([]);\n\n  useEffect(() => {\n    fetch("/api/users")\n      .then(res => res.json())\n      .then(data => setUsers(data));\n  }, []);\n\n  return <div>{users.length} Users Found</div>;\n}\n',
      "server/routes/userRoutes.js":
        'const express = require("express");\nconst router = express.Router();\nconst { getUsers } = require("../controllers/userController");\n\n// Bug: wrong endpoint path\nrouter.get("/user", getUsers);\n\nmodule.exports = router;\n',
      "server/controllers/userController.js":
        'const getUsers = (req, res) => {\n  res.json([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);\n};\n\nmodule.exports = { getUsers };\n',
      "server/server.js":
        'const express = require("express");\nconst app = express();\nconst userRoutes = require("./routes/userRoutes");\n\napp.use("/api/users", userRoutes);\n\napp.listen(5000);\n',
    },
  },
];

// Pick a random challenge from the array on every request
app.get("/api/challenges/random", (req, res) => {
  const randomIndex = Math.floor(Math.random() * challenges.length);
  const randomChallenge = challenges[randomIndex];

  res.status(200).json({
    success: true,
    data: randomChallenge,
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});