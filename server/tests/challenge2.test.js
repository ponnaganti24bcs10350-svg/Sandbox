const vm = require("vm");

function loadModule(source, filename, mocks) {
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    console,
    require(request) {
      if (Object.prototype.hasOwnProperty.call(mocks, request)) {
        return mocks[request];
      }
      throw new Error(`Unexpected require in ${filename}: ${request}`);
    },
    process,
    Buffer,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(
    `(function(require,module,exports){${source}\n})(require,module,exports);`,
    sandbox,
    { filename }
  );

  return module.exports;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeQuery(rows, tracker) {
  let current = rows.slice();

  const query = {
    sort(spec) {
      const [field, direction] = Object.entries(spec)[0];
      current.sort((a, b) => {
        const av = a[field] instanceof Date ? a[field].getTime() : a[field];
        const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
        if (av === bv) return 0;
        return direction === -1 ? (av > bv ? -1 : 1) : (av < bv ? -1 : 1);
      });
      return query;
    },
    skip(n) {
      current = current.slice(n);
      return query;
    },
    limit(n) {
      current = current.slice(0, n);
      return query;
    },
    lean() {
      return Promise.resolve(clone(current));
    },
    then(resolve, reject) {
      return Promise.resolve(clone(current)).then(resolve, reject);
    },
  };

  return query;
}

function matches(row, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.entries(filter).every(([key, condition]) => {
    if (condition && typeof condition === "object" && "$in" in condition) {
      return condition.$in.map(String).includes(String(row[key]));
    }
    return row[key] === condition;
  });
}

function makeDataset() {
  const users = [];
  for (let i = 1; i <= 500; i++) {
    users.push({
      _id: `user-${i}`,
      name: `User ${i}`,
      avatar: `/avatars/${i}.png`,
    });
  }

  const posts = [];
  for (let i = 1; i <= 50000; i++) {
    posts.push({
      _id: `post-${i}`,
      authorId: `user-${((i - 1) % 500) + 1}`,
      title: `Post ${i}`,
      content: `Content for post ${i}`,
      tags: [`tag-${i % 10}`],
      status: i % 7 === 0 ? "draft" : "published",
      createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000),
    });
  }

  return { users, posts };
}

async function runController(source, page, limit, options = {}) {
  const { users, posts } = makeDataset();
  const tracker = { postFindCalls: 0, userFindCalls: 0, userFindByIdCalls: 0 };
  const Post = {
    find(filter) {
      tracker.postFindCalls++;
      return makeQuery(posts.filter((p) => matches(p, filter)), tracker);
    },
    countDocuments(filter) {
      return Promise.resolve(posts.filter((p) => matches(p, filter)).length);
    },
  };
  const User = {
    find(filter) {
      tracker.userFindCalls++;
      return makeQuery(users.filter((u) => matches(u, filter)), tracker);
    },
    findById(id) {
      tracker.userFindByIdCalls++;
      return makeQuery(users.filter((u) => String(u._id) === String(id)), tracker);
    },
  };

  const controller = loadModule(source, "postController.js", {
    "../models/Post": Post,
    "../models/User": User,
  });

  let response = null;
  const result = await controller.getPosts(
    { query: { page: String(page), limit: String(limit) } },
    {
      status(code) {
        response = { status: code };
        return {
          json(body) {
            response.body = body;
            return response;
          },
        };
      },
      json(body) {
        response = { status: 200, body };
        return response;
      },
    }
  );

  if (!response && result && result.body) response = result;
  return { response, tracker, users, posts };
}

function pass(message) {
  return { ok: true, message };
}
function fail(message) {
  return { ok: false, message };
}

async function testChallenge2(files) {
  const controllerSource = files["server/challenge2/controllers/postController.js"];
  const routeSource = files["server/challenge2/routes/postRoutes.js"];
  const existingTests = files["server/challenge2/tests/existing.test.js"];

  const tests = [];
  const add = async (name, fn) => {
    try {
      const result = await fn();
      tests.push({ name, ...result });
    } catch (error) {
      tests.push({ name, ok: false, message: error.message });
    }
  };

  if (!controllerSource) {
    return {
      passed: false,
      testsPassed: 0,
      totalTests: 14,
      message: "Challenge 2 controller is missing.",
    };
  }

  await add("basic response contract", async () => {
    const { response } = await runController(controllerSource, 1, 20);
    const body = response?.body;
    return body && response.status === 200 && Array.isArray(body.data) && body.pagination
      ? pass("Basic response contract is correct.")
      : fail("Response contract is incorrect.");
  });

  await add("pagination", async () => {
    const { response } = await runController(controllerSource, 2, 10);
    const body = response?.body;
    return body?.pagination?.page === 2 && body.pagination.limit === 10 && body.data.length === 10
      ? pass("Pagination works.")
      : fail("Pagination is incorrect.");
  });

  await add("published filtering", async () => {
    const { response } = await runController(controllerSource, 1, 100);
    return response.body.data.every((p) => p.title && !p.title.includes("draft"))
      ? pass("Only published posts are returned.")
      : fail("Draft posts were returned.");
  });

  await add("complete post data", async () => {
    const { response } = await runController(controllerSource, 1, 20);
    const post = response.body.data[0];
    const ok = post && ["id", "title", "content", "tags", "createdAt", "author"].every((k) => Object.prototype.hasOwnProperty.call(post, k));
    return ok ? pass("Complete post data is preserved.") : fail("Required post fields are missing.");
  });

  await add("newest first", async () => {
    const { response } = await runController(controllerSource, 1, 20);
    const dates = response.body.data.map((p) => new Date(p.createdAt).getTime());
    return dates.every((v, i) => i === 0 || dates[i - 1] >= v)
      ? pass("Posts are newest first.")
      : fail("Posts are not newest first.");
  });

  await add("pagination total", async () => {
    const { response } = await runController(controllerSource, 1, 20);
    const expectedTotal = 50000 - Math.floor(50000 / 7);
    return response.body.pagination.total === expectedTotal && response.body.pagination.totalPages === Math.ceil(expectedTotal / 20)
      ? pass("Pagination totals are correct.")
      : fail("Pagination totals are incorrect.");
  });

  await add("author information", async () => {
    const { response } = await runController(controllerSource, 1, 20);
    const author = response.body.data[0]?.author;
    return author && author.id && author.name && Object.prototype.hasOwnProperty.call(author, "avatar")
      ? pass("Author information is included.")
      : fail("Author information is missing or incomplete.");
  });

  await add("larger page", async () => {
    const { response } = await runController(controllerSource, 1, 100);
    return response.body.data.length === 100 && response.body.pagination.limit === 100
      ? pass("Maximum page size works.")
      : fail("Larger page size is not handled correctly.");
  });

  await add("bounded author queries", async () => {
    const { tracker } = await runController(controllerSource, 1, 50);
    return tracker.userFindByIdCalls === 0 && tracker.userFindCalls <= 1
      ? pass("Author queries are bounded.")
      : fail(`Too many per-post author queries: findById=${tracker.userFindByIdCalls}, find=${tracker.userFindCalls}.`);
  });

  await add("large dataset efficiency", async () => {
    const start = Date.now();
    const { tracker, response } = await runController(controllerSource, 1, 100);
    const elapsed = Date.now() - start;
    return response.status === 200 && tracker.userFindByIdCalls === 0 && tracker.userFindCalls <= 1 && elapsed <= 1500
      ? pass("Large dataset is handled efficiently.")
      : fail(`Large dataset efficiency failed (${elapsed}ms, userFind=${tracker.userFindCalls}, findById=${tracker.userFindByIdCalls}).`);
  });

  await add("different pages return different data", async () => {
    const a = await runController(controllerSource, 1, 10);
    const b = await runController(controllerSource, 2, 10);
    return a.response.body.data[0]?.id !== b.response.body.data[0]?.id
      ? pass("Different pages return different data.")
      : fail("Pagination returns the same data for different pages.");
  });

  await add("response depends on requested page", async () => {
    const a = await runController(controllerSource, 3, 7);
    const b = await runController(controllerSource, 4, 7);
    const idsA = a.response.body.data.map((p) => p.id).join(",");
    const idsB = b.response.body.data.map((p) => p.id).join(",");
    return idsA !== idsB ? pass("Response depends on requested page.") : fail("Page parameter is not affecting the result.");
  });

  await add("route registration", async () => {
    if (!routeSource) return fail("postRoutes.js is missing.");
    let registeredPath = null;
    const router = {
      get(path, handler) {
        registeredPath = { path, handler };
      },
    };
    const express = { Router: () => router };
    const controller = { getPosts: () => {} };
    loadModule(routeSource, "postRoutes.js", {
      express,
      "../controllers/postController": controller,
    });
    return registeredPath?.path === "/" && registeredPath.handler === controller.getPosts
      ? pass("Posts route is registered correctly.")
      : fail("Posts route is not registered correctly.");
  });

  await add("regression coverage", async () => {
    if (!existingTests) return fail("Existing tests are missing.");
    const meaningful = [
      /published/i,
      /newest|order/i,
      /author/i,
      /pagination/i,
      /missing/i,
    ].filter((re) => re.test(existingTests)).length;
    const assertions = (existingTests.match(/expect\s*\(/g) || []).length;
    return meaningful >= 5 && assertions >= 5
      ? pass("Regression coverage is present.")
      : fail("Regression tests are missing meaningful assertions.");
  });

  const testsPassed = tests.filter((t) => t.ok).length;
  const totalTests = tests.length;
  const passed = testsPassed === totalTests && totalTests === 14;

  return {
    passed,
    testsPassed,
    totalTests,
    message: passed
      ? "Performance investigation passed. The posts API preserves its contract and handles the large dataset efficiently."
      : "Performance tests failed. Investigate the API, database access pattern, and regression behaviour.",
  };
}

module.exports = testChallenge2;
