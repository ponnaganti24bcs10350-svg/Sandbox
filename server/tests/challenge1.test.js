const vm = require("vm");
const crypto = require("crypto");

function loadModule(source, filename, mocks = {}) {
  const module = { exports: {} };

  const sandbox = {
    module,
    exports: module.exports,
    require: (request) => {
      if (Object.prototype.hasOwnProperty.call(mocks, request)) {
        return mocks[request];
      }

      throw new Error(`Unexpected require: ${request}`);
    },
    console,
    process,
    Buffer,
  };

  vm.runInNewContext(source, sandbox, {
    filename,
  });

  return module.exports;
}

function randomId() {
  return crypto.randomBytes(16).toString("hex");
}

function deepClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function executeController(controller, request) {
  const response = createResponse();

  try {
    await controller(request, response);

    return {
      statusCode: response.statusCode,
      body: response.body,
      error: null,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: undefined,
      error,
    };
  }
}

async function testChallenge1(files) {
  const requiredFiles = [
    "server/middleware/auth.js",
    "server/controllers/userController.js",
    "server/models/User.js",
    "server/models/Activity.js",
    "tests/existing.test.js",
  ];

  for (const file of requiredFiles) {
    if (!files[file]) {
      return {
        passed: false,
        testsPassed: 0,
        totalTests: 18,
        message: `${file} is missing.`,
      };
    }
  }

  /*
   * ------------------------------------------------------------
   * DYNAMIC TEST DATA
   * ------------------------------------------------------------
   */

  const userOne = {
    _id: randomId(),
    name: `User-${randomId()}`,
    email: `${randomId()}@example.test`,
    role: "student",
    passwordHash: `hash-${randomId()}`,
    resetToken: `reset-${randomId()}`,
    avatar: `/avatars/${randomId()}.png`,
  };

  const userTwo = {
    _id: randomId(),
    name: `User-${randomId()}`,
    email: `${randomId()}@example.test`,
    role: "company",
    passwordHash: `hash-${randomId()}`,
    resetToken: `reset-${randomId()}`,
    avatar: `/avatars/${randomId()}.png`,
  };

  const userThree = {
    _id: randomId(),
    name: `User-${randomId()}`,
    email: `${randomId()}@example.test`,
    role: "admin",
    passwordHash: `hash-${randomId()}`,
    resetToken: `reset-${randomId()}`,
    avatar: `/avatars/${randomId()}.png`,
  };

  const records = new Map([
    [String(userOne._id), deepClone(userOne)],
    [String(userTwo._id), deepClone(userTwo)],
    [String(userThree._id), deepClone(userThree)],
  ]);

  const activities = new Map([
    [
      String(userOne._id),
      [
        {
          _id: randomId(),
          userId: userOne._id,
          action: "login",
          metadata: {
            ip: "10.10.10.10",
          },
          createdAt: new Date("2026-01-03T10:00:00Z"),
        },
        {
          _id: randomId(),
          userId: userOne._id,
          action: "profile_update",
          metadata: {
            field: "name",
          },
          createdAt: new Date("2026-01-02T10:00:00Z"),
        },
      ],
    ],
    [
      String(userTwo._id),
      [
        {
          _id: randomId(),
          userId: userTwo._id,
          action: "login",
          metadata: {
            ip: "20.20.20.20",
          },
          createdAt: new Date("2026-01-04T10:00:00Z"),
        },
      ],
    ],
  ]);

  /*
   * ------------------------------------------------------------
   * DATABASE OBSERVATION
   * ------------------------------------------------------------
   */

  const calls = {
    findById: [],
    findByIdAndUpdate: [],
    activityFind: [],
  };

  function resetCalls() {
    calls.findById.length = 0;
    calls.findByIdAndUpdate.length = 0;
    calls.activityFind.length = 0;
  }

  function clone(value) {
    return deepClone(value);
  }

  /*
   * ------------------------------------------------------------
   * MOCK USER MODEL
   * ------------------------------------------------------------
   */

  const User = {
    findById(id) {
      calls.findById.push(String(id));

      return {
        lean: async () => {
          return clone(records.get(String(id)) || null);
        },

        then(resolve, reject) {
          return Promise.resolve(
            clone(records.get(String(id)) || null)
          ).then(resolve, reject);
        },
      };
    },

    findByIdAndUpdate(id, update) {
      calls.findByIdAndUpdate.push({
        id: String(id),
        update: clone(update),
      });

      const current = records.get(String(id));

      if (!current) {
        return {
          lean: async () => null,
        };
      }

      /*
       * Simulate Mongo-style $set.
       */
      const patch =
        update &&
        update.$set &&
        typeof update.$set === "object"
          ? update.$set
          : update || {};

      const updated = {
        ...current,
        ...patch,
      };

      records.set(String(id), updated);

      return {
        lean: async () => clone(updated),
      };
    },
  };

  /*
   * ------------------------------------------------------------
   * MOCK ACTIVITY MODEL
   * ------------------------------------------------------------
   */

  const Activity = {
    find(query) {
      calls.activityFind.push(clone(query));

      const userActivities =
        activities.get(String(query.userId)) || [];

      return {
        sort() {
          return this;
        },

        lean: async () => clone(userActivities),
      };
    },
  };

  /*
   * ------------------------------------------------------------
   * DYNAMIC JWT IMPLEMENTATION
   * ------------------------------------------------------------
   *
   * The candidate does NOT know these tokens beforehand.
   */

  const tokenMap = new Map([
    [
      `candidate.${randomId()}`,
      String(userOne._id),
    ],
    [
      `candidate.${randomId()}`,
      String(userTwo._id),
    ],
    [
      `candidate.${randomId()}`,
      String(userThree._id),
    ],
  ]);

  const validTokenOne = [...tokenMap.entries()].find(
    ([, id]) => id === String(userOne._id)
  )[0];

  const validTokenTwo = [...tokenMap.entries()].find(
    ([, id]) => id === String(userTwo._id)
  )[0];

  const validTokenThree = [...tokenMap.entries()].find(
    ([, id]) => id === String(userThree._id)
  )[0];

  const jwt = {
    verify(token) {
      if (!token || typeof token !== "string") {
        throw new Error("Invalid token");
      }

      const userId = tokenMap.get(token);

      if (!userId) {
        throw new Error("Invalid token");
      }

      return {
        id: userId,
      };
    },
  };

  /*
   * ------------------------------------------------------------
   * LOAD CANDIDATE CODE
   * ------------------------------------------------------------
   */

  let authModule;
  let controllerModule;

  try {
    authModule = loadModule(
      files["server/middleware/auth.js"],
      "server/middleware/auth.js",
      {
        jsonwebtoken: jwt,
        "../models/User": User,
      }
    );

    controllerModule = loadModule(
      files["server/controllers/userController.js"],
      "server/controllers/userController.js",
      {
        "../models/User": User,
        "../models/Activity": Activity,
      }
    );
  } catch (error) {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 18,
      message: `Candidate code could not be loaded: ${error.message}`,
    };
  }

  const middleware =
    authModule.protect ||
    authModule.authenticate ||
    authModule;

  const getUser = controllerModule.getUser;
  const getUserActivity = controllerModule.getUserActivity;
  const updateUser = controllerModule.updateUser;

  if (typeof middleware !== "function") {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 18,
      message: "Authentication middleware could not be found.",
    };
  }

  if (
    typeof getUser !== "function" ||
    typeof getUserActivity !== "function" ||
    typeof updateUser !== "function"
  ) {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 18,
      message:
        "Required user controller functions could not be found.",
    };
  }

  /*
   * ------------------------------------------------------------
   * MIDDLEWARE EXECUTION
   * ------------------------------------------------------------
   */

  async function executeMiddleware(token) {
    const req = {
      headers: token
        ? {
            authorization: `Bearer ${token}`,
          }
        : {},
    };

    const res = createResponse();

    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    return {
      req,
      res,
      nextCalled,
    };
  }

  /*
   * ------------------------------------------------------------
   * TEST HELPERS
   * ------------------------------------------------------------
   */

  let testsPassed = 0;
  const failures = [];

  function pass() {
    testsPassed++;
  }

  function fail(message) {
    failures.push(message);
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  /*
   * ============================================================
   * TEST 1
   * Dynamic valid authentication
   * ============================================================
   */

  try {
    const result = await executeMiddleware(validTokenOne);

    if (
      result.nextCalled &&
      result.res.statusCode === 200 &&
      result.req.user &&
      String(result.req.user._id || result.req.user.id) ===
        String(userOne._id)
    ) {
      pass();
    } else {
      fail("Valid dynamic authentication failed.");
    }
  } catch (error) {
    fail(`Dynamic authentication crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 2
   * Invalid token rejected
   * ============================================================
   */

  try {
    const result = await executeMiddleware(
      `invalid.${randomId()}`
    );

    if (
      result.res.statusCode === 401 &&
      !result.nextCalled
    ) {
      pass();
    } else {
      fail("Invalid authentication token was accepted.");
    }
  } catch (error) {
    fail(`Invalid-token test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 3
   * Missing authentication rejected
   * ============================================================
   */

  try {
    const result = await executeMiddleware(null);

    if (
      result.res.statusCode === 401 &&
      !result.nextCalled
    ) {
      pass();
    } else {
      fail("Missing authentication was accepted.");
    }
  } catch (error) {
    fail(`Missing-authentication test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 4
   * Owner can read own profile
   * ============================================================
   */

  try {
    resetCalls();

    const result = await executeController(
      getUser,
      {
        params: {
          id: String(userOne._id),
        },
        user: {
          _id: userOne._id,
        },
      }
    );

    if (
      result.statusCode === 200 &&
      isObject(result.body) &&
      result.body.data &&
      String(result.body.data.id) ===
        String(userOne._id) &&
      result.body.data.name === userOne.name &&
      result.body.data.email === userOne.email
    ) {
      pass();
    } else {
      fail("Owner cannot retrieve their own profile correctly.");
    }
  } catch (error) {
    fail(`Owner profile test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 5
   * Cross-user profile read blocked
   * ============================================================
   */

  try {
    resetCalls();

    const result = await executeController(
      getUser,
      {
        params: {
          id: String(userTwo._id),
        },
        user: {
          _id: userOne._id,
        },
      }
    );

    if (
      result.statusCode === 403 &&
      calls.findById.length === 0
    ) {
      pass();
    } else {
      fail(
        "Cross-user profile access was not blocked before the database lookup."
      );
    }
  } catch (error) {
    fail(`Cross-user profile test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 6
   * Cross-user profile read with different identity
   * ============================================================
   */

  try {
    resetCalls();

    const result = await executeController(
      getUser,
      {
        params: {
          id: String(userThree._id),
        },
        user: {
          _id: userTwo._id,
        },
      }
    );

    if (
      result.statusCode === 403 &&
      calls.findById.length === 0
    ) {
      pass();
    } else {
      fail(
        "Authorization can be bypassed by another authenticated identity."
      );
    }
  } catch (error) {
    fail(`Second cross-user read test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 7
   * Sensitive password hash not exposed
   * ============================================================
   */

  try {
    const result = await executeController(
      getUser,
      {
        params: {
          id: String(userOne._id),
        },
        user: {
          _id: userOne._id,
        },
      }
    );

    const body = result.body || {};
    const data = body.data || body;

    const forbiddenFields = [
      "passwordHash",
      "resetToken",
      "password",
      "secret",
    ];

    const exposed = forbiddenFields.some((field) =>
      Object.prototype.hasOwnProperty.call(data, field)
    );

    if (result.statusCode === 200 && !exposed) {
      pass();
    } else {
      fail("Sensitive authentication data is exposed.");
    }
  } catch (error) {
    fail(`Sensitive-field test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 8
   * Owner can read activity
   * ============================================================
   */

  try {
    resetCalls();

    const result = await executeController(
      getUserActivity,
      {
        params: {
          id: String(userOne._id),
        },
        user: {
          _id: userOne._id,
        },
      }
    );

    if (
      result.statusCode === 200 &&
      result.body &&
      Array.isArray(result.body.data) &&
      calls.activityFind.length === 1 &&
      String(calls.activityFind[0].userId) ===
        String(userOne._id)
    ) {
      pass();
    } else {
      fail("Owner cannot retrieve their own activity correctly.");
    }
  } catch (error) {
    fail(`Owner activity test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 9
   * Cross-user activity blocked
   * ============================================================
   */

  try {
    resetCalls();

    const result = await executeController(
      getUserActivity,
      {
        params: {
          id: String(userTwo._id),
        },
        user: {
          _id: userOne._id,
        },
      }
    );

    if (
      result.statusCode === 403 &&
      calls.activityFind.length === 0
    ) {
      pass();
    } else {
      fail(
        "Cross-user activity access was not blocked before the database query."
      );
    }
  } catch (error) {
    fail(`Cross-user activity test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 10
   * Owner can update name
   * ============================================================
   */

  try {
    resetCalls();

    const newName = `Updated-${randomId()}`;

    const result = await executeController(
      updateUser,
      {
        params: {
          id: String(userOne._id),
        },
        user: {
          _id: userOne._id,
        },
        body: {
          name: newName,
        },
      }
    );

    const call = calls.findByIdAndUpdate[0];

    if (
      result.statusCode === 200 &&
      call &&
      String(call.id) === String(userOne._id) &&
      call.update &&
      call.update.$set &&
      call.update.$set.name === newName
    ) {
      pass();
    } else {
      fail("Owner cannot safely update an allowed field.");
    }
  } catch (error) {
    fail(`Owner update test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 11
   * Owner can update email
   * ============================================================
   */

  try {
    resetCalls();

    const newEmail = `${randomId()}@example.test`;

    const result = await executeController(
      updateUser,
      {
        params: {
          id: String(userOne._id),
        },
        user: {
          _id: userOne._id,
        },
        body: {
          email: newEmail,
        },
      }
    );

    const call = calls.findByIdAndUpdate[0];

    if (
      result.statusCode === 200 &&
      call &&
      call.update &&
      call.update.$set &&
      call.update.$set.email === newEmail
    ) {
      pass();
    } else {
      fail("Owner cannot safely update an allowed email field.");
    }
  } catch (error) {
    fail(`Owner email update test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 12
   * Protected fields cannot be mass assigned
   * ============================================================
   */

  try {
    resetCalls();

    const attackerHash = `attacker-${randomId()}`;

    const result = await executeController(
      updateUser,
      {
        params: {
          id: String(userOne._id),
        },
        user: {
          _id: userOne._id,
        },
        body: {
          name: `Safe-${randomId()}`,
          email: `${randomId()}@example.test`,
          role: "admin",
          passwordHash: attackerHash,
          resetToken: "attacker-reset-token",
          _id: userThree._id,
        },
      }
    );

    const call = calls.findByIdAndUpdate[0];

    const update =
      call && call.update
        ? call.update.$set || call.update
        : {};

    const forbidden = [
      "role",
      "passwordHash",
      "resetToken",
      "_id",
    ];

    const modifiedProtectedField = forbidden.some((field) =>
      Object.prototype.hasOwnProperty.call(update, field)
    );

    if (
      result.statusCode === 200 &&
      !modifiedProtectedField
    ) {
      pass();
    } else {
      fail(
        "Protected fields can be modified through mass assignment."
      );
    }
  } catch (error) {
    fail(`Mass-assignment test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 13
   * Cross-user update blocked before DB mutation
   * ============================================================
   */

  try {
    resetCalls();

    const originalName = records.get(
      String(userTwo._id)
    ).name;

    const result = await executeController(
      updateUser,
      {
        params: {
          id: String(userTwo._id),
        },
        user: {
          _id: userOne._id,
        },
        body: {
          name: `Hacked-${randomId()}`,
        },
      }
    );

    const afterName = records.get(
      String(userTwo._id)
    ).name;

    if (
      result.statusCode === 403 &&
      calls.findByIdAndUpdate.length === 0 &&
      afterName === originalName
    ) {
      pass();
    } else {
      fail(
        "Cross-user profile modification is possible."
      );
    }
  } catch (error) {
    fail(`Cross-user update test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 14
   * Cross-user update from another identity
   * ============================================================
   */

  try {
    resetCalls();

    const originalEmail = records.get(
      String(userThree._id)
    ).email;

    const result = await executeController(
      updateUser,
      {
        params: {
          id: String(userThree._id),
        },
        user: {
          _id: userTwo._id,
        },
        body: {
          email: `${randomId()}@attacker.test`,
        },
      }
    );

    const afterEmail = records.get(
      String(userThree._id)
    ).email;

    if (
      result.statusCode === 403 &&
      calls.findByIdAndUpdate.length === 0 &&
      afterEmail === originalEmail
    ) {
      pass();
    } else {
      fail(
        "A different authenticated identity can modify another account."
      );
    }
  } catch (error) {
    fail(`Second cross-user update test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 15
   * Missing user returns 404
   * ============================================================
   */

  try {
    const missingId = randomId();

    const result = await executeController(
      getUser,
      {
        params: {
          id: missingId,
        },
        user: {
          _id: missingId,
        },
      }
    );

    if (result.statusCode === 404) {
      pass();
    } else {
      fail("Missing user does not return 404.");
    }
  } catch (error) {
    fail(`Missing-user test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 16
   * Missing activity behaves safely
   * ============================================================
   */

  try {
    const missingId = randomId();

    const result = await executeController(
      getUserActivity,
      {
        params: {
          id: missingId,
        },
        user: {
          _id: missingId,
        },
      }
    );

    if (
      result.statusCode === 200 &&
      result.body &&
      Array.isArray(result.body.data)
    ) {
      pass();
    } else {
      fail(
        "Activity endpoint does not safely handle an account with no activity."
      );
    }
  } catch (error) {
    fail(`Missing-activity test crashed: ${error.message}`);
  }

  /*
   * ============================================================
   * TEST 17
   * Authentication must bind identity correctly
   * ============================================================
   */

  try {
    const resultOne = await executeMiddleware(
      validTokenOne
    );

    const resultTwo = await executeMiddleware(
      validTokenTwo
    );

    const resultThree = await executeMiddleware(
      validTokenThree
    );

    const correct =
      String(
        resultOne.req.user &&
          (resultOne.req.user._id ||
            resultOne.req.user.id)
      ) === String(userOne._id) &&
      String(
        resultTwo.req.user &&
          (resultTwo.req.user._id ||
            resultTwo.req.user.id)
      ) === String(userTwo._id) &&
      String(
        resultThree.req.user &&
          (resultThree.req.user._id ||
            resultThree.req.user.id)
      ) === String(userThree._id);

    if (
      correct &&
      resultOne.nextCalled &&
      resultTwo.nextCalled &&
      resultThree.nextCalled
    ) {
      pass();
    } else {
      fail(
        "Authentication does not correctly bind different tokens to their identities."
      );
    }
  } catch (error) {
    fail(
      `Multi-identity authentication test crashed: ${error.message}`
    );
  }

  /*
   * ============================================================
   * TEST 18
   * Regression tests must actually contain executable tests
   * ============================================================
   *
   * We intentionally do NOT accept simple keyword insertion.
   *
   * The candidate must have test definitions covering the
   * security behavior.
   */

  try {
    const regressionSource =
      files["tests/existing.test.js"];

    const testCalls =
      (
        regressionSource.match(
          /\b(?:test|it)\s*\(/g
        ) || []
      ).length;

    const describeCalls =
      (
        regressionSource.match(
          /\bdescribe\s*\(/g
        ) || []
      ).length;

    const meaningfulAssertions =
      (
        regressionSource.match(
          /\b(?:expect|assert|strictEqual|deepStrictEqual|toBe|toEqual|toThrow|rejects|resolves)\b/g
        ) || []
      ).length;

    const securityTerms =
      [
        "unauthorized",
        "forbidden",
        "ownership",
        "password",
        "reset",
        "cross-user",
        "authentication",
        "authorization",
      ].filter((term) =>
        regressionSource.toLowerCase().includes(term)
      ).length;

    if (
      testCalls >= 3 &&
      describeCalls >= 1 &&
      meaningfulAssertions >= 3 &&
      securityTerms >= 2
    ) {
      pass();
    } else {
      fail(
        "Regression tests are missing meaningful executable security coverage."
      );
    }
  } catch (error) {
    fail(
      `Regression-test verification crashed: ${error.message}`
    );
  }

  /*
   * ------------------------------------------------------------
   * FINAL RESULT
   * ------------------------------------------------------------
   */

  return {
    passed: testsPassed === 18,
    testsPassed,
    totalTests: 18,
    message:
      testsPassed === 18
        ? "Account takeover protections verified."
        : failures.join(" "),
  };
}

module.exports = testChallenge1;