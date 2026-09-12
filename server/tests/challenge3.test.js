function testChallenge3(files) {
  const routeFile =
    files["server/routes/userRoutes.js"];

  if (!routeFile) {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 2,
      message: "userRoutes.js is missing.",
    };
  }

  let testsPassed = 0;
  const totalTests = 2;

  // Test 1: GET route should use "/" because
  // server.js mounts the router at /api/users
  const hasCorrectRoute =
    routeFile.includes('router.get("/", getUsers)') ||
    routeFile.includes("router.get('/', getUsers)");

  if (hasCorrectRoute) {
    testsPassed++;
  }

  // Test 2: The route should use getUsers controller
  const usesController =
    routeFile.includes("getUsers");

  if (usesController) {
    testsPassed++;
  }

  if (testsPassed === totalTests) {
    return {
      passed: true,
      testsPassed,
      totalTests,
      message: "Users API endpoint is correctly configured.",
    };
  }

  return {
    passed: false,
    testsPassed,
    totalTests,
    message: "The users API endpoint is still incorrect.",
  };
}

module.exports = testChallenge3;