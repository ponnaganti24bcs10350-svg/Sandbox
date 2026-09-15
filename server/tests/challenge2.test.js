function testChallenge2(files) {
  const middleware =
    files["server/middleware/authMiddleware.js"];

  if (!middleware) {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 3,
      message: "authMiddleware.js is missing.",
    };
  }

  let testsPassed = 0;

  // Test 1: Authorization header should be checked
  const checksAuthorization =
    middleware.includes("authorization");

  if (checksAuthorization) {
    testsPassed++;
  }

  // Test 2: Bearer token should be extracted
  const checksBearer =
    middleware.includes("Bearer") ||
    middleware.includes("bearer");

  if (checksBearer) {
    testsPassed++;
  }

  // Test 3: Invalid JWT should be handled
  const handlesErrors =
    middleware.includes("try") &&
    middleware.includes("catch");

  if (handlesErrors) {
    testsPassed++;
  }

  return {
    passed: testsPassed === 3,
    testsPassed,
    totalTests: 3,
    message:
      testsPassed === 3
        ? "JWT authentication middleware is working correctly."
        : "JWT authentication middleware still has issues.",
  };
}

module.exports = testChallenge2;