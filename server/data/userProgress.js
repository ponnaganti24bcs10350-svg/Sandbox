const userProgress = {};

function getUserProgress(userId) {
  if (!userProgress[userId]) {
    userProgress[userId] = {
      history: [],
      currentIndex: -1,
      solved: [],
    };
  }

  return userProgress[userId];
}

module.exports = {
  getUserProgress,
};