const testChallenge1 = require("../tests/challenge1.test");
const testChallenge2 = require("../tests/challenge2.test");
const testChallenge3 = require("../tests/challenge3.test");

const challengeRunners = new Map([
  ["1", testChallenge1],
  ["2", testChallenge2],
  ["3", testChallenge3],
]);

function getChallengeRunner(challengeId) {
  return challengeRunners.get(String(challengeId)) || null;
}

module.exports = {
  getChallengeRunner,
};
