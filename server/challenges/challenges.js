const challenges = [
  {
    challengeId: "1",
    title: "ACCOUNT TAKEOVER — Security Incident",
    level: "Advanced Junior",
    time: "60 minutes",

    description: `
SECURITY INCIDENT

Our social platform has reported suspicious activity.

Some authenticated users appear to be accessing or modifying information belonging to other users.

You have been given the backend repository, database data, API documentation, application logs, and existing tests.

Investigate the application and determine what is allowing unauthorized access.

Your task is to identify the root cause, fix the vulnerability, and ensure that legitimate functionality continues to work.

You are not told which endpoint or file is responsible.
`,

    requirements: [
      "Reproduce the reported behaviour.",
      "Trace the request through the authentication and authorization flow.",
      "Identify the root cause.",
      "Fix the vulnerability.",
      "Verify that users can access their own resources.",
      "Verify that users cannot access or modify resources belonging to other users.",
      "Protect sensitive user information from being exposed.",
      "Add regression tests for the vulnerability.",
      "Run the existing test suite and ensure existing functionality still works.",
      "Do not rewrite the application.",
      "Make focused changes based on your investigation.",
    ],

    files: {
      "server/middleware/auth.js": `
const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid authentication token"
    });
  }
};
`,
 "server/routes/userRoutes.js": `
const express = require("express");
const {
  getUser,
  updateUser,
  getUserActivity
} = require("../controllers/userController");

const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/:id", getUser);

router.get("/:id/activity", getUserActivity);

router.patch("/:id", updateUser);

module.exports = router;
`,
  "server/controllers/userController.js": `
const User = require("../models/User");
const Activity = require("../models/Activity");

async function getUser(req, res) {
  const user = await User.findById(req.params.id).lean();

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  return res.json({
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: user.passwordHash
    }
  });
}

async function getUserActivity(req, res) {
  const activity = await Activity.find({
    userId: req.params.id
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    data: activity
  });
}

async function updateUser(req, res) {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: updates
    },
    {
      new: true,
      runValidators: true
    }
  ).lean();

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  return res.json({
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}

module.exports = {
  getUser,
  getUserActivity,
  updateUser
};
`,
 "server/models/User.js": `
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    role: {
      type: String,
      enum: ["student", "company", "admin"],
      default: "student"
    },

    passwordHash: {
      type: String,
      required: true
    },

    resetToken: {
      type: String,
      default: null
    },

    avatar: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
`,
"server/models/Activity.js": `
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    action: {
      type: String,
      required: true
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Activity", activitySchema);
`,
  "server/data/users.json": `
[
  {
    "_id": "64a100000000000000000001",
    "name": "Aarav",
    "email": "aarav@example.com",
    "role": "student",
    "passwordHash": "$2b$10$example-hash-aarav",
    "resetToken": null,
    "avatar": "/avatars/aarav.png"
  },
  {
    "_id": "64a100000000000000000002",
    "name": "Meera",
    "email": "meera@example.com",
    "role": "student",
    "passwordHash": "$2b$10$example-hash-meera",
    "resetToken": "reset-example-meera",
    "avatar": "/avatars/meera.png"
  },
  {
    "_id": "64a100000000000000000003",
    "name": "Rohan",
    "email": "rohan@example.com",
    "role": "company",
    "passwordHash": "$2b$10$example-hash-rohan",
    "resetToken": null,
    "avatar": "/avatars/rohan.png"
  }
]
`,
  "docs/API.md": `
# User API

All user endpoints require authentication.

## GET /api/users/:id

Returns the requested user's profile.

Response:

{
  "data": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "..."
  }
}

## GET /api/users/:id/activity

Returns recent activity associated with the requested user.

Response:

{
  "data": [
    {
      "id": "...",
      "action": "...",
      "createdAt": "..."
    }
  ]
}

## PATCH /api/users/:id

Updates editable profile information.

Accepted fields:

- name
- email

Response:

{
  "data": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "..."
  }
}

Authentication:

Authorization: Bearer <token>

The API should preserve existing HTTP status conventions.
`,
  "logs/security.log": `
2026-08-14T09:14:22Z INFO auth request accepted user=64a100000000000000000001 route=GET /api/users/64a100000000000000000001
2026-08-14T09:17:04Z INFO profile request user=64a100000000000000000001 target=64a100000000000000000002 status=200
2026-08-14T09:17:04Z WARN unusual profile access actor=64a100000000000000000001 target=64a100000000000000000002
2026-08-14T09:21:47Z INFO activity request actor=64a100000000000000000001 target=64a100000000000000000002 status=200
2026-08-14T09:26:18Z WARN profile modification actor=64a100000000000000000001 target=64a100000000000000000002 status=200
2026-08-14T09:31:55Z INFO authentication successful user=64a100000000000000000002
2026-08-14T09:32:11Z INFO profile request user=64a100000000000000000002 target=64a100000000000000000002 status=200
`,
 "tests/existing.test.js": `
describe("User API", () => {
  test("authenticated users can retrieve a valid user profile", async () => {
    // Existing behaviour: authenticated profile requests return
    // the expected public profile structure.
  });

  test("authenticated users can update their editable profile fields", async () => {
    // Existing behaviour: valid profile updates continue to work.
  });

  test("missing users return the expected not-found response", async () => {
    // Existing behaviour: requests for resources that do not exist
    // return the appropriate error response.
  });

  test("activity is returned in reverse chronological order", async () => {
    // Existing behaviour: activity remains newest-first.
  });
});
`,
    },
  },

  {
    challengeId: "2",
    title: "THE 8-SECOND API — Performance Investigation",
    level: "Advanced Junior",
    time: "75 minutes",

    description: `
PERFORMANCE INCIDENT

The /api/posts endpoint was working normally when the application had a small number of users.

The platform now contains a significantly larger amount of data, and users are reporting extremely slow response times.

You have been given the existing application, database data, API documentation, application logs, and tests.

The endpoint returns the correct information, so the problem is not immediately obvious.

Your team lead has asked you to investigate the performance degradation and fix the underlying problem.
`,

    requirements: [
      "Reproduce the performance issue.",
      "Measure the current behaviour.",
      "Investigate the complete request flow.",
      "Identify the actual bottleneck.",
      "Implement an appropriate optimization.",
      "Preserve the API's expected behaviour.",
      "Verify the improvement using measurements.",
      "Ensure the solution works with a larger dataset.",
      "Run the existing tests.",
      "Add regression tests where appropriate.",
      "Do not remove required functionality.",
      "Do not return incomplete data.",
    ],

    files: {
      "server/challenge2/routes/postRoutes.js": "const express = require(\"express\");\nconst { getPosts } = require(\"../controllers/postController\");\n\nconst router = express.Router();\n\nrouter.get(\"/\", getPosts);\n\nmodule.exports = router;",
      "server/challenge2/controllers/postController.js": "const Post = require(\"../models/Post\");\nconst User = require(\"../models/User\");\n\nasync function getPosts(req, res) {\n  try {\n    const page = Math.max(\n      parseInt(req.query.page, 10) || 1,\n      1\n    );\n\n    const limit = Math.min(\n      parseInt(req.query.limit, 10) || 20,\n      100\n    );\n\n    const skip = (page - 1) * limit;\n\n    // Intentionally inefficient implementation.\n    // The candidate must investigate why this becomes slow\n    // with a large dataset.\n    const posts = await Post.find({\n      status: \"published\",\n    })\n      .sort({ createdAt: -1 })\n      .skip(skip)\n      .limit(limit)\n      .lean();\n\n    const result = [];\n\n    for (const post of posts) {\n      const author = await User.findById(post.authorId).lean();\n\n      result.push({\n        id: post._id,\n        title: post.title,\n        content: post.content,\n        tags: post.tags,\n        createdAt: post.createdAt,\n        author: author\n          ? {\n              id: author._id,\n              name: author.name,\n              avatar: author.avatar,\n            }\n          : null,\n      });\n    }\n\n    // Additional unnecessary database work.\n    const total = await Post.countDocuments({\n      status: \"published\",\n    });\n\n    return res.status(200).json({\n      data: result,\n      pagination: {\n        page,\n        limit,\n        total,\n        totalPages: Math.ceil(total / limit),\n      },\n    });\n  } catch (error) {\n    console.error(error);\n\n    return res.status(500).json({\n      message: \"Failed to retrieve posts\",\n    });\n  }\n}\n\nmodule.exports = {\n  getPosts,\n};",
      "server/challenge2/models/Post.js": "const mongoose = require(\"mongoose\");\n\nconst postSchema = new mongoose.Schema(\n  {\n    authorId: {\n      type: mongoose.Schema.Types.ObjectId,\n      required: true,\n      index: true,\n    },\n\n    title: {\n      type: String,\n      required: true,\n    },\n\n    content: {\n      type: String,\n      required: true,\n    },\n\n    status: {\n      type: String,\n      enum: [\"published\", \"draft\"],\n      default: \"published\",\n      index: true,\n    },\n\n    tags: {\n      type: [String],\n      default: [],\n    },\n\n    createdAt: {\n      type: Date,\n      default: Date.now,\n      index: true,\n    },\n  },\n  {\n    versionKey: false,\n  }\n);\n\nmodule.exports = mongoose.model(\"Challenge2Post\", postSchema);",
      "server/challenge2/models/User.js": "const mongoose = require(\"mongoose\");\n\nconst userSchema = new mongoose.Schema(\n  {\n    name: {\n      type: String,\n      required: true,\n    },\n\n    avatar: {\n      type: String,\n      default: null,\n    },\n  },\n  {\n    versionKey: false,\n  }\n);\n\nmodule.exports = mongoose.model(\"Challenge2User\", userSchema);",
      "server/challenge2/tests/existing.test.js": "describe(\"Posts API\", () => {\n  test(\"returns published posts\", () => {\n    expect(true).toBe(true);\n  });\n\n  test(\"returns posts in newest-first order\", () => {\n    expect(true).toBe(true);\n  });\n\n  test(\"includes author information\", () => {\n    expect(true).toBe(true);\n  });\n\n  test(\"supports pagination\", () => {\n    expect(true).toBe(true);\n  });\n\n  test(\"handles missing authors safely\", () => {\n    expect(true).toBe(true);\n  });\n});",
      "server/challenge2/API.md": "# Posts API\n\n## GET /api/posts\n\nReturns a paginated list of published posts.\n\n### Query Parameters\n\n| Parameter | Type | Default | Description |\n|---|---|---:|---|\n| page | number | 1 | Page number |\n| limit | number | 20 | Number of posts per page |\n\n### Example\n\nGET /api/posts?page=1&limit=20\n\n### Response\n\n```json\n{\n  \"data\": [\n    {\n      \"id\": \"post-id\",\n      \"title\": \"Example title\",\n      \"content\": \"Example content\",\n      \"tags\": [\"backend\"],\n      \"createdAt\": \"2026-08-01T10:00:00.000Z\",\n      \"author\": {\n        \"id\": \"user-id\",\n        \"name\": \"Example User\",\n        \"avatar\": \"/avatars/example.png\"\n      }\n    }\n  ],\n  \"pagination\": {\n    \"page\": 1,\n    \"limit\": 20,\n    \"total\": 100,\n    \"totalPages\": 5\n  }\n}",
      "server/challenge2/data/posts.json": "[\n  {\n    \"_id\": \"68b7a2010000000000000001\",\n    \"authorId\": \"68b7a1010000000000000001\",\n    \"title\": \"Building Better APIs\",\n    \"content\": \"A discussion about API design and backend engineering.\",\n    \"status\": \"published\",\n    \"tags\": [\"api\", \"backend\"],\n    \"createdAt\": \"2026-08-01T10:00:00.000Z\"\n  },\n  {\n    \"_id\": \"68b7a2010000000000000002\",\n    \"authorId\": \"68b7a1010000000000000002\",\n    \"title\": \"Scaling Node.js Applications\",\n    \"content\": \"Lessons from scaling a Node.js application.\",\n    \"status\": \"published\",\n    \"tags\": [\"node\", \"performance\"],\n    \"createdAt\": \"2026-08-02T10:00:00.000Z\"\n  },\n  {\n    \"_id\": \"68b7a2010000000000000003\",\n    \"authorId\": \"68b7a1010000000000000003\",\n    \"title\": \"Database Performance\",\n    \"content\": \"Understanding database queries and indexes.\",\n    \"status\": \"published\",\n    \"tags\": [\"mongodb\", \"database\"],\n    \"createdAt\": \"2026-08-03T10:00:00.000Z\"\n  }\n]",
      "server/challenge2/data/users.json": "[\n  {\n    \"_id\": \"68b7a1010000000000000001\",\n    \"name\": \"Aarav Sharma\",\n    \"avatar\": \"/avatars/aarav.png\"\n  },\n  {\n    \"_id\": \"68b7a1010000000000000002\",\n    \"name\": \"Diya Patel\",\n    \"avatar\": \"/avatars/diya.png\"\n  },\n  {\n    \"_id\": \"68b7a1010000000000000003\",\n    \"name\": \"Kabir Rao\",\n    \"avatar\": \"/avatars/kabir.png\"\n  },\n  {\n    \"_id\": \"68b7a1010000000000000004\",\n    \"name\": \"Meera Nair\",\n    \"avatar\": \"/avatars/meera.png\"\n  },\n  {\n    \"_id\": \"68b7a1010000000000000005\",\n    \"name\": \"Rohan Gupta\",\n    \"avatar\": \"/avatars/rohan.png\"\n  }\n]"
}, 
  },

  {
    challengeId: "3",
    title: "PRODUCTION IS DOWN — Full Engineering Investigation",
    level: "Advanced Junior / Strong Junior",
    time: "90 minutes",

    description: `
🚨 PRODUCTION INCIDENT

CampusConnect has just deployed a new version of its backend.

Shortly after deployment, users began reporting several problems:

• Some users are unable to log in.
• Some users are receiving incorrect data.
• Some users are able to perform actions they should not be allowed to perform.
• Some API requests are returning HTTP 500 errors.

The engineering team has not identified the root causes.

You have been assigned to investigate the incident.

You are given:

The existing backend repository
Database data
Application logs
API documentation
Existing tests

You are NOT told which files are broken or what the root causes are.

Your task is to investigate the system, identify the root causes, implement reliable fixes, and verify that the application is functioning correctly.
`,

    requirements: [
      "Start and understand the existing application.",
      "Reproduce the reported failures.",
      "Investigate the logs and application behaviour.",
      "Trace affected requests through routes, middleware, controllers, and database operations.",
      "Determine the root cause of each significant issue.",
      "Fix the underlying problems rather than hiding the symptoms.",
      "Verify authentication and authorization behaviour.",
      "Verify data integrity and API responses.",
      "Handle invalid and missing resources correctly.",
      "Add regression tests for the issues you fix.",
      "Run the complete test suite.",
      "Perform a final verification of the application.",
      "Do not rewrite the application.",
      "Do not make changes simply to make individual tests pass.",
      "Investigate first, make focused changes, and verify your solution.",
      "Provide a short explanation of the root causes discovered and why the fixes solve them.",
    ],

    files: {
      // Candidate-visible repository goes here.
    },
  },
];

module.exports = challenges;