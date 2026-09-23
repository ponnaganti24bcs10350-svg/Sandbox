const challengeCategories = {
  BACKEND_MERN: "backend-mern",
  REACT: "react",
  JAVASCRIPT_TYPESCRIPT: "javascript-typescript",
};

const categoryDefinitions = [
  {
    key: challengeCategories.BACKEND_MERN,
    name: "Backend (MERN)",
    description: "Node.js, Express, MongoDB, APIs, security, and performance.",
    challengeIds: ["1", "2", "3"],
  },
  {
    key: challengeCategories.REACT,
    name: "React.js",
    description: "React applications, state, rendering, and frontend architecture.",
    challengeIds: [],
  },
  {
    key: challengeCategories.JAVASCRIPT_TYPESCRIPT,
    name: "JavaScript + TypeScript",
    description: "Language fundamentals, runtime behavior, and type-safe design.",
    challengeIds: [],
  },
];

function getCategoryDefinition(categoryKey) {
  return categoryDefinitions.find((category) => category.key === categoryKey) || null;
}

module.exports = {
  challengeCategories,
  categoryDefinitions,
  getCategoryDefinition,
};
