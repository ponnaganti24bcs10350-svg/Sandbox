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
    projectOverview: {
  application: `
This challenge is based on a backend API for a social platform.
Authenticated users can view profiles, view activity, and update
their own profile information.
`,

  architecture: `
Client
  ↓
Express Router
  ↓
Authentication Middleware
  ↓
User Controller
  ↓
MongoDB Models
  ↓
Database
`,

  requestFlow: `
HTTP Request
  ↓
userRoutes.js
  ↓
auth.js
  ↓
userController.js
  ↓
User / Activity models
  ↓
MongoDB
  ↓
JSON Response
`,

  projectStructure: `
server/
├── middleware/
│   └── auth.js
├── routes/
│   └── userRoutes.js
├── controllers/
│   └── userController.js
├── models/
│   ├── User.js
│   └── Activity.js
├── data/
│   └── users.json
├── docs/
│   └── API.md
├── logs/
│   └── security.log
└── tests/
    └── existing.test.js
`,

  responsibilities: `
auth.js
Handles authentication for incoming requests.

userRoutes.js
Defines the available user API endpoints.

userController.js
Contains the application logic for retrieving,
updating, and retrieving activity for users.

User.js
Defines the structure of user records.

Activity.js
Defines activity records associated with users.

users.json
Contains the provided user data for investigation.

API.md
Documents the expected API behaviour and response format.

security.log
Contains evidence from the reported incident.

existing.test.js
Contains existing application behaviour that should
continue working after your changes.
`,

  investigationGuide: `
Start by understanding how a request moves through the application.

Trace the flow from:

Route
→ Authentication
→ Controller
→ Database
→ Response

Use the API documentation, logs, database data, and tests
to understand the expected and actual behaviour.

You are not told which file contains the problem.
Determine the root cause through your investigation.
`
},

    files: {
      "server/middleware/auth.js": `
// Authentication middleware for protected requests.

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
// User API routes.

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
// User profile and activity operations.

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
// User document definition.

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
// User activity document definition.

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
   
  });

  test("authenticated users can update their editable profile fields", async () => {
   
  });

  test("missing users return the expected not-found response", async () => {
   
  });

  test("activity is returned in reverse chronological order", async () => {
   
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
    projectOverview: {
  application: `
This challenge is based on a backend API that provides
a paginated feed of published posts.

Each post contains its own information and references
the user who created it.
`,

  architecture: `
Client
  ↓
Express Router
  ↓
Post Controller
  ├── Post Model
  └── User Model
  ↓
MongoDB
  ↓
JSON Response
`,

  requestFlow: `
HTTP Request
  ↓
postRoutes.js
  ↓
postController.js
  ↓
Post / User database operations
  ↓
Response construction
  ↓
JSON Response
`,

  projectStructure: `
server/challenge2/
├── routes/
│   └── postRoutes.js
├── controllers/
│   └── postController.js
├── models/
│   ├── Post.js
│   └── User.js
├── data/
│   ├── posts.json
│   └── users.json
├── tests/
│   └── existing.test.js
└── API.md
`,

  responsibilities: `
postRoutes.js
Defines the HTTP endpoints for the posts API.

postController.js
Contains the logic for retrieving posts,
pagination, and constructing the API response.

Post.js
Defines the structure of post records.

User.js
Defines the user information associated with posts.

posts.json
Contains the provided post data.

users.json
Contains the provided user data.

API.md
Documents the expected endpoint, pagination,
response structure, and returned fields.

existing.test.js
Contains existing behaviour that should continue
working after your changes.
`,

  investigationGuide: `
Start by reproducing the reported performance problem.

Trace the request from the route into the controller
and then follow the database operations involved in
building the response.

Measure the current behaviour before making changes.

Use the API documentation, data, logs, and tests to
understand what the endpoint is expected to do.

The underlying bottleneck is not identified for you.
Determine it through investigation and measurement.
`
},

    files: {
      "server/challenge2/routes/postRoutes.js": "// Posts API routes.\nconst express = require(\"express\");\nconst { getPosts } = require(\"../controllers/postController\");\n\nconst router = express.Router();\n\nrouter.get(\"/\", getPosts);\n\nmodule.exports = router;",
      "server/challenge2/controllers/postController.js": "// Posts feed and pagination operations.\nconst Post = require(\"../models/Post\");\nconst User = require(\"../models/User\");\n\nasync function getPosts(req, res) {\n  try {\n    const page = Math.max(\n      parseInt(req.query.page, 10) || 1,\n      1\n    );\n\n    const limit = Math.min(\n      parseInt(req.query.limit, 10) || 20,\n      100\n    );\n\n        const skip = (page - 1) * limit;\n\n            const posts = await Post.find({\n      status: \"published\",\n    })\n      .sort({ createdAt: -1 })\n      .skip(skip)\n      .limit(limit)\n      .lean();\n\n        const result = [];\n\n    for (const post of posts) {\n      const author = await User.findById(post.authorId).lean();\n\n      result.push({\n        id: post._id,\n        title: post.title,\n        content: post.content,\n        tags: post.tags,\n        createdAt: post.createdAt,\n        author: author\n          ? {\n              id: author._id,\n              name: author.name,\n              avatar: author.avatar,\n            }\n          : null,\n      });\n    }\n\n   \n        const total = await Post.countDocuments({\n      status: \"published\",\n    });\n\n    return res.status(200).json({\n      data: result,\n      pagination: {\n        page,\n        limit,\n        total,\n        totalPages: Math.ceil(total / limit),\n      },\n    });\n  } catch (error) {\n    console.error(error);\n\n    return res.status(500).json({\n      message: \"Failed to retrieve posts\",\n    });\n  }\n}\n\nmodule.exports = {\n  getPosts,\n};",
      "server/challenge2/models/Post.js": "// Post document definition.\nconst mongoose = require(\"mongoose\");\n\nconst postSchema = new mongoose.Schema(\n  {\n    authorId: {\n      type: mongoose.Schema.Types.ObjectId,\n      required: true,\n      index: true,\n    },\n\n    title: {\n      type: String,\n      required: true,\n    },\n\n    content: {\n      type: String,\n      required: true,\n    },\n\n    status: {\n      type: String,\n      enum: [\"published\", \"draft\"],\n      default: \"published\",\n      index: true,\n    },\n\n    tags: {\n      type: [String],\n      default: [],\n    },\n\n    createdAt: {\n      type: Date,\n      default: Date.now,\n      index: true,\n    },\n  },\n  {\n    versionKey: false,\n  }\n);\n\nmodule.exports = mongoose.model(\"Challenge2Post\", postSchema);",
      "server/challenge2/models/User.js": "// Author information used by the posts API.\nconst mongoose = require(\"mongoose\");\n\nconst userSchema = new mongoose.Schema(\n  {\n    name: {\n      type: String,\n      required: true,\n    },\n\n    avatar: {\n      type: String,\n      default: null,\n    },\n  },\n  {\n    versionKey: false,\n  }\n);\n\nmodule.exports = mongoose.model(\"Challenge2User\", userSchema);",
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
projectOverview: {
  application: `
This challenge is based on a production backend for a
campus platform.

The backend provides authentication and post-management
functionality for authenticated users.
`,

  architecture: `
Client
  ↓
Express Server
  ↓
Routes
  ↓
Authentication Middleware
  ↓
Controllers
  ├── Authentication
  └── Posts
  ↓
MongoDB Models
  ↓
Database
`,

  requestFlow: `
Login:

Client
  ↓
Authentication Route
  ↓
authController.js
  ↓
User Model
  ↓
JWT Response


Post Requests:

Client
  ↓
postRoutes.js
  ↓
auth.js
  ↓
postController.js
  ↓
Post / User Models
  ↓
MongoDB
  ↓
JSON Response
`,

  projectStructure: `
server/
├── middleware/
│   └── auth.js
├── controllers/
│   ├── authController.js
│   └── postController.js
├── routes/
│   └── postRoutes.js
├── models/
│   ├── User.js
│   └── Post.js
├── data/
│   └── production.json
├── docs/
│   └── API.md
├── logs/
│   └── production.log
└── tests/
    └── existing.test.js
`,

  responsibilities: `
auth.js
Processes authentication information before protected
requests reach the controllers.

authController.js
Contains the login behaviour and authentication response.

postRoutes.js
Defines the HTTP endpoints for post operations.

postController.js
Contains the application logic for retrieving,
updating, and deleting posts.

User.js
Defines the structure of user records.

Post.js
Defines the structure of post records and their
relationship to users.

production.json
Contains the provided production data for investigation.

API.md
Documents the expected API behaviour.

production.log
Contains evidence from the production incident.

existing.test.js
Contains existing application behaviour that should
continue working after your changes.
`,

  investigationGuide: `
Start with the reported production symptoms.

Use the production logs to identify affected requests
and then reproduce those behaviours.

Trace each affected request through:

Route
→ Middleware
→ Controller
→ Database
→ Response

Compare the actual behaviour with the API documentation
and existing tests.

Use the production data to understand relationships
between users and posts.

Investigate the underlying causes before making changes.
Fix the underlying problems and verify that the affected
behaviour works correctly afterwards.

The broken files and root causes are not identified for you.
`
},
    files: {
      "server/middleware/auth.js": `
const jwt = require("jsonwebtoken");
module.exports = function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
      return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
      const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    return res.status(500).json({
      message: "Authentication failed",
    });
  }
};
`,
      "server/controllers/authController.js": `
// Authentication and login operations.

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function login(req, res) {
  const user = await User.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    token: jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    ),
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
}

module.exports = { login };
`,
      "server/controllers/postController.js": `
// Post retrieval and management operations.

const Post = require("../models/Post");

async function getPost(req, res) {
    const post = await Post.findById(req.params.id).lean();

  if (!post) {
    return res.status(200).json({ data: null });
  }

  return res.json({ data: post });
}

async function getPosts(req, res) {
    const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ data: posts });
}

async function updatePost(req, res) {
    const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $set: { body: req.body.body } },
    { new: true }
  ).lean();

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  return res.json({ data: post });
}

async function deletePost(req, res) {
    const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  return res.json({ success: true });
}

module.exports = {
  getPost,
  getPosts,
  updatePost,
  deletePost,
};
`,
      "server/routes/postRoutes.js": `
// Protected post API routes.

const express = require("express");
const auth = require("../middleware/auth");
const {
  getPost,
  getPosts,
  updatePost,
  deletePost,
} = require("../controllers/postController");

const router = express.Router();

router.use(auth);
router.get("/", getPosts);
router.get("/:id", getPost);
router.patch("/:id", updatePost);
router.delete("/:id", deletePost);

module.exports = router;
`,
      "server/models/User.js": `
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["student", "company", "admin"] },
});

module.exports = mongoose.model("Challenge3User", userSchema);
`,
      "server/models/Post.js": `
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    body: { type: String, required: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge3User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Challenge3Post", postSchema);
`,
      "server/data/production.json": `
{
  "users": [
    {
      "_id": "64a300000000000000000001",
      "email": "aarav@example.com",
      "password": "$2b$10$example-hash-aarav",
      "role": "student"
    },
    {
      "_id": "64a300000000000000000002",
      "email": "meera@example.com",
      "password": "$2b$10$example-hash-meera",
      "role": "student"
    }
  ],
  "posts": [
    {
      "_id": "64a400000000000000000001",
      "body": "Aarav's post",
      "author": "64a300000000000000000001"
    },
    {
      "_id": "64a400000000000000000002",
      "body": "Meera's post",
      "author": "64a300000000000000000002"
    }
  ]
}
`,
      "server/docs/API.md": `
# CampusConnect API

All post routes require a Bearer token.

## POST /api/auth/login

Returns a token for valid credentials.

## GET /api/posts/:id

Returns one post or a not-found response.

## PATCH /api/posts/:id

Updates a post when the authenticated user is allowed to edit it.

## DELETE /api/posts/:id

Deletes a post when the authenticated user is allowed to delete it.
`,
      "server/logs/production.log": `
2026-08-20T08:10:01Z INFO deployment version=2026.08.20
2026-08-20T08:12:04Z WARN login email=aarav@example.com status=500
2026-08-20T08:13:11Z WARN post request actor=64a300000000000000000001 target=64a400000000000000000002 status=200
2026-08-20T08:14:22Z ERROR GET /api/posts/64a400000000000000000099 status=500
`,
      "tests/existing.test.js": `
describe("CampusConnect production API", () => {
  test("valid users can log in", async () => {
   
  });

  test("users can read their own post", async () => {
   
  });

  test("missing posts return the documented response", async () => {
   
  });

  test("post responses preserve the documented shape", async () => {
   
  });
});
`,
    },
  },
];

module.exports = challenges;