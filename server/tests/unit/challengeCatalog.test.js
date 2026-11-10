const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getChallengeById,
  listCategories,
  listChallenges,
} = require("../../challenges/catalog");

test("catalog exposes the supported category taxonomy", () => {
  assert.deepEqual(
    listCategories().map((category) => category.key),
    ["backend-mern", "react", "javascript-typescript"]
  );
});

test("catalog assigns legacy challenges to backend-mern", () => {
  const challenges = listChallenges({ category: "backend-mern" });

  assert.equal(challenges.length, 3);
  assert.ok(challenges.every((challenge) => challenge.category === "backend-mern"));
});

test("catalog filters unknown and future empty categories safely", () => {
  assert.deepEqual(listChallenges({ category: "react" }), []);
  assert.deepEqual(listChallenges({ category: "does-not-exist" }), []);
});

test("catalog preserves stable challenge identifiers", () => {
  assert.equal(getChallengeById("1").challengeId, "1");
  assert.equal(getChallengeById("missing"), null);
});
