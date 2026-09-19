const fs = require("fs");
const path = require("path");

const USER_COUNT = 500;
const POST_COUNT = 50000;

const users = [];

for (let i = 0; i < USER_COUNT; i++) {
  users.push({
    _id: `68b7a101${String(i + 100).padStart(16, "0")}`,
    name: `User ${i + 1}`,
    avatar: `/avatars/user-${i + 1}.png`,
  });
}

const posts = [];

for (let i = 0; i < POST_COUNT; i++) {
  const user = users[i % users.length];

  posts.push({
    _id: `68b7a201${String(i + 100).padStart(16, "0")}`,
    authorId: user._id,
    title: `Engineering Post ${i + 1}`,
    content:
      `This is sample engineering content for performance testing. Post ${i + 1}.`,
    status: i % 20 === 0 ? "draft" : "published",
    tags: [
      i % 2 === 0 ? "backend" : "frontend",
      i % 3 === 0 ? "performance" : "engineering",
    ],
    createdAt: new Date(
      Date.UTC(
        2026,
        0,
        1,
        0,
        0,
        i
      )
    ).toISOString(),
  });
}

const dataDir = __dirname;

fs.writeFileSync(
  path.join(dataDir, "users.generated.json"),
  JSON.stringify(users, null, 2)
);

fs.writeFileSync(
  path.join(dataDir, "posts.generated.json"),
  JSON.stringify(posts, null, 2)
);

console.log(
  `Generated ${users.length} users and ${posts.length} posts.`
);