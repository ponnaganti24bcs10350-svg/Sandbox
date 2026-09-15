const Challenge = require("../models/Challenge");

const testChallenge1 = require("../tests/challenge1.test");
const testChallenge2 = require("../tests/challenge2.test");
const testChallenge3 = require("../tests/challenge3.test");


// GET RANDOM CHALLENGE
const getRandomChallenge = async (req, res) => {
  try {
    const mockChallenge = {
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
          "const express = require(\"express\");\n\nconst router = express.Router();\n\nmodule.exports = router;\n",
      },
    };

    return res.status(200).json({
      success: true,
      data: mockChallenge,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// RUN CHALLENGE TESTS
function runChallenge(req, res) {
  try {
    const { challengeId, files } = req.body;

    if (!challengeId || !files) {
      return res.status(400).json({
        passed: false,
        message: "challengeId and files are required",
      });
    }


    // CHALLENGE 1
    if (challengeId === "1") {
      const result = testChallenge1(files);

      return res.json(result);
    }


    // CHALLENGE 2
    if (challengeId === "2") {
      const result = testChallenge2(files);

      return res.json(result);
    }


    // CHALLENGE 3
    if (challengeId === "3") {
      const result = testChallenge3(files);

      return res.json(result);
    }


    // INVALID CHALLENGE
    return res.status(404).json({
      passed: false,
      message: "Challenge not found",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      passed: false,
      message: "Failed to run challenge",
    });
  }
}


// EXPORT BOTH FUNCTIONS
module.exports = {
  getRandomChallenge,
  runChallenge,
};