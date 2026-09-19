const vm = require("vm");
const crypto = require("crypto");

function loadModule(source, filename, mocks) {
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    console,
    process,
    Buffer,
    require(request) {
      if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
      throw new Error(`Unexpected require in ${filename}: ${request}`);
    },
  };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})(require,module,exports);`, sandbox, { filename });
  return module.exports;
}

function id() {
  return crypto.randomBytes(16).toString("hex");
}

function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function run(handler, request) {
  const res = response();
  try {
    await handler(request, res);
    return { statusCode: res.statusCode, body: res.body };
  } catch (error) {
    return { statusCode: 500, error };
  }
}

function finalResult(passed) {
  return {
    passed: passed === 18,
    testsPassed: passed,
    totalTests: 18,
    message: passed === 18
      ? "Production verification complete."
      : "Production verification is incomplete.",
  };
}

async function testChallenge3(files) {
  const requiredFiles = [
    "server/middleware/auth.js",
    "server/controllers/authController.js",
    "server/controllers/postController.js",
    "server/routes/postRoutes.js",
    "server/models/User.js",
    "server/models/Post.js",
    "server/data/production.json",
    "server/docs/API.md",
    "server/logs/production.log",
    "tests/existing.test.js",
  ];

  if (requiredFiles.some((file) => !files[file])) {
    return finalResult(0);
  }

  const userOne = {
    _id: id(),
    email: `one-${id()}@example.test`,
    password: "stored-password",
    role: "student",
  };
  const userTwo = {
    _id: id(),
    email: `two-${id()}@example.test`,
    password: "stored-password",
    role: "student",
  };
  const postOne = { _id: id(), author: userOne._id, body: "Own post" };
  const postTwo = { _id: id(), author: userTwo._id, body: "Private post" };
  const users = new Map([[String(userOne._id), copy(userOne)], [String(userTwo._id), copy(userTwo)]]);
  const posts = new Map([[String(postOne._id), copy(postOne)], [String(postTwo._id), copy(postTwo)]]);
  const calls = { postFind: [], postUpdate: [], postDelete: [] };

  function query(value) {
    return {
      select() { return this; },
      lean: async () => copy(value),
      then(resolve, reject) { return Promise.resolve(copy(value)).then(resolve, reject); },
    };
  }

  const User = {
    findOne(filter) {
      const found = [...users.values()].find((user) =>
        Object.entries(filter).every(([key, value]) => String(user[key]) === String(value))
      );
      if (!found) return query(null);
      return {
        select() { return this; },
        lean: async () => copy(found),
        then(resolve, reject) {
          return Promise.resolve({
            ...copy(found),
            matchPassword: async (password) => password === "correct-password",
          }).then(resolve, reject);
        },
      };
    },
    findById(userId) { return query(users.get(String(userId)) || null); },
  };

  const Post = {
    findById(postId) {
      calls.postFind.push({ _id: String(postId) });
      return query(posts.get(String(postId)) || null);
    },
    find(filter = {}) {
      calls.postFind.push(copy(filter));
      const rows = [...posts.values()].filter((post) =>
        Object.entries(filter).every(([key, value]) => String(post[key]) === String(value))
      );
      return {
        sort() { return this; },
        lean: async () => copy(rows),
        populate() { return this; },
        then(resolve, reject) { return Promise.resolve(copy(rows)).then(resolve, reject); },
      };
    },
    findOneAndUpdate(filter, update) {
      calls.postUpdate.push({ filter: copy(filter), update: copy(update) });
      const post = [...posts.values()].find((row) =>
        Object.entries(filter).every(([key, value]) => String(row[key]) === String(value))
      );
      if (!post) return query(null);
      const updated = { ...post, ...(update.$set || update) };
      posts.set(String(post._id), updated);
      return query(updated);
    },
    findByIdAndUpdate(postId, update) { return this.findOneAndUpdate({ _id: postId }, update); },
    findOneAndDelete(filter) {
      calls.postDelete.push(copy(filter));
      const post = [...posts.values()].find((row) =>
        Object.entries(filter).every(([key, value]) => String(row[key]) === String(value))
      );
      if (post) posts.delete(String(post._id));
      return query(post || null);
    },
    findByIdAndDelete(postId) { return this.findOneAndDelete({ _id: postId }); },
  };

  const jwt = {
    verify(token) {
      if (token === "token-one") return { id: userOne._id };
      if (token === "token-two") return { id: userTwo._id };
      throw new Error("Invalid token");
    },
    sign(payload) { return `signed-${payload.id}`; },
  };

  let auth;
  let authController;
  let postController;
  try {
    auth = loadModule(files["server/middleware/auth.js"], "auth.js", {
      jsonwebtoken: jwt,
      "../models/User": User,
    });
    authController = loadModule(files["server/controllers/authController.js"], "authController.js", {
      "../models/User": User,
      bcrypt: { compare: async (password) => password === "correct-password" },
      bcryptjs: { compare: async (password) => password === "correct-password" },
      jsonwebtoken: jwt,
    });
    postController = loadModule(files["server/controllers/postController.js"], "postController.js", {
      "../models/Post": Post,
      "../models/User": User,
    });
  } catch (error) {
    return finalResult(0);
  }

  const middleware = auth.protect || auth.authenticate || auth;
  const login = authController.login || authController.signIn || authController.authenticate;
  const getPost = postController.getPost || postController.getPostById || postController.getById;
  const getPosts = postController.getPosts || postController.listPosts || postController.getAllPosts;
  const updatePost = postController.updatePost || postController.editPost;
  const deletePost = postController.deletePost || postController.removePost;

  if (typeof middleware !== "function" || typeof login !== "function" || typeof getPost !== "function") {
    return finalResult(0);
  }

  let passed = 0;
  const check = (condition) => { if (condition) passed++; };

  async function runAuth(token) {
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
    const res = response();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
  }

  const valid = await runAuth("token-one");
  check(valid.nextCalled && valid.res.statusCode === 200 && valid.req.user);
  const invalid = await runAuth("invalid-token");
  check(invalid.res.statusCode === 401 && !invalid.nextCalled);
  const missing = await runAuth(null);
  check(missing.res.statusCode === 401 && !missing.nextCalled);

  const loginResult = await run(login, { body: { email: userOne.email, password: "correct-password" } });
  check(loginResult.statusCode >= 200 && loginResult.statusCode < 300 && loginResult.body);
  const badLogin = await run(login, { body: { email: userOne.email, password: "wrong-password" } });
  check(badLogin.statusCode === 401);

  const own = await run(getPost, { params: { id: String(postOne._id) }, user: { _id: userOne._id } });
  check(own.statusCode === 200 && own.body);
  const other = await run(getPost, { params: { id: String(postTwo._id) }, user: { _id: userOne._id } });
  check(other.statusCode === 403 || other.statusCode === 404);
  const missingPost = await run(getPost, { params: { id: id() }, user: { _id: userOne._id } });
  check(missingPost.statusCode === 404);
  check(!own.body?.password && !own.body?.passwordHash && !own.body?.resetToken);

  if (typeof getPosts === "function") {
    const list = await run(getPosts, { user: { _id: userOne._id }, query: {} });
    check(list.statusCode === 200 && Array.isArray(list.body?.data || list.body));
  } else {
    check(false);
  }

  if (typeof updatePost === "function") {
    const update = await run(updatePost, {
      params: { id: String(postOne._id) },
      user: { _id: userOne._id },
      body: { body: "Updated" },
    });
    check(update.statusCode >= 200 && update.statusCode < 300);
    const blockedUpdate = await run(updatePost, {
      params: { id: String(postTwo._id) },
      user: { _id: userOne._id },
      body: { body: "Unauthorized" },
    });
    check(blockedUpdate.statusCode === 403 || blockedUpdate.statusCode === 404);
  } else {
    check(false);
    check(false);
  }

  if (typeof deletePost === "function") {
    const blockedDelete = await run(deletePost, {
      params: { id: String(postTwo._id) },
      user: { _id: userOne._id },
    });
    check(blockedDelete.statusCode === 403 || blockedDelete.statusCode === 404);
    const ownerDelete = await run(deletePost, {
      params: { id: String(postOne._id) },
      user: { _id: userOne._id },
    });
    check(ownerDelete.statusCode >= 200 && ownerDelete.statusCode < 300);
  } else {
    check(false);
    check(false);
  }

  check(calls.postDelete.every((filter) => filter.author || filter.userId || filter._id));
  check(/try\s*\{|catch\s*\(/.test(files["server/controllers/authController.js"]) || /try\s*\{|catch\s*\(/.test(files["server/controllers/postController.js"]));
  check(/protect|auth|authenticate/.test(files["server/routes/postRoutes.js"]));

  const regression = files["tests/existing.test.js"];
  const testCount = (regression.match(/\b(?:test|it)\s*\(/g) || []).length;
  const assertionCount = (regression.match(/\b(?:expect|assert|strictEqual|deepStrictEqual|toBe|toEqual|toThrow|rejects|resolves)\b/g) || []).length;
  const terms = ["login", "unauthorized", "forbidden", "ownership", "500", "not found", "authorization"]
    .filter((term) => regression.toLowerCase().includes(term)).length;
  check(testCount >= 4 && assertionCount >= 4 && terms >= 3);

  return finalResult(passed);
}

module.exports = testChallenge3;
