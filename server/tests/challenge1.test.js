function testChallenge1(files) {
  const routeFile = files["server/routes/authRoutes.js"];

  if (!routeFile) {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 1,
      message: "authRoutes.js is missing.",
    };
  }

  const hasLoginRoute =
    routeFile.includes('router.post("/login"') ||
    routeFile.includes("router.post('/login'");

  if (!hasLoginRoute) {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 1,
      message: "Login POST route is missing.",
    };
  }

  return {
    passed: true,
    testsPassed: 1,
    totalTests: 1,
    message: "Login route is correctly configured.",
  };
}

module.exports = testChallenge1;