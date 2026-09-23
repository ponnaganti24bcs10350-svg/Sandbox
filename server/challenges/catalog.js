const legacyChallenges = require("./challenges");
const {
  categoryDefinitions,
  getCategoryDefinition,
} = require("./categories");

const challengeCategoryById = new Map(
  categoryDefinitions.flatMap((category) =>
    category.challengeIds.map((challengeId) => [challengeId, category.key])
  )
);

function withCatalogMetadata(challenge) {
  if (!challenge) return null;

  const category = challengeCategoryById.get(challenge.challengeId);

  return {
    ...challenge,
    category: category || null,
  };
}

function listChallenges({ category } = {}) {
  const categoryDefinition = category ? getCategoryDefinition(category) : null;

  if (category && !categoryDefinition) return [];

  const source = categoryDefinition
    ? legacyChallenges.filter((challenge) =>
        categoryDefinition.challengeIds.includes(challenge.challengeId)
      )
    : legacyChallenges;

  return source.map(withCatalogMetadata);
}

function getChallengeById(challengeId) {
  return withCatalogMetadata(
    legacyChallenges.find((challenge) => challenge.challengeId === String(challengeId))
  );
}

function getCategoryForChallenge(challengeId) {
  const categoryKey = challengeCategoryById.get(String(challengeId));
  return categoryKey ? getCategoryDefinition(categoryKey) : null;
}

function listCategories() {
  return categoryDefinitions.map((category) => ({
    ...category,
    challengeCount: legacyChallenges.filter((challenge) =>
      category.challengeIds.includes(challenge.challengeId)
    ).length,
  }));
}

module.exports = {
  listChallenges,
  getChallengeById,
  getCategoryForChallenge,
  listCategories,
};
