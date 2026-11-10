import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../app/apiClient";

const categoryQueryKey = ["challenge-categories"];

async function fetchCategories() {
  const result = await apiRequest("/api/challenges/categories");
  return result.data || [];
}

async function fetchChallenges(category) {
  const result = await apiRequest(
    `/api/challenges?category=${encodeURIComponent(category)}`
  );
  return result.data || [];
}

function ChallengeCatalog({ onPractice }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const categoriesQuery = useQuery({
    queryKey: categoryQueryKey,
    queryFn: fetchCategories,
  });
  const challengesQuery = useQuery({
    queryKey: ["challenges", selectedCategory || categoriesQuery.data?.[0]?.key],
    queryFn: () => fetchChallenges(selectedCategory || categoriesQuery.data[0].key),
    enabled: Boolean(selectedCategory || categoriesQuery.data?.[0]?.key),
  });

  const categories = categoriesQuery.data || [];
  const activeCategory = selectedCategory || categories[0]?.key || "";
  const challenges = challengesQuery.data || [];
  const error = categoriesQuery.error || challengesQuery.error;

  return (
    <section className="challenge-catalog">
      <h1>Challenge Catalog</h1>
      <p>Choose a skill track to practice.</p>

      {error && <p role="alert">{error.message}</p>}

      <div className="challenge-categories">
        {categories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={activeCategory === category.key ? "active" : ""}
            onClick={() => setSelectedCategory(category.key)}
          >
            <strong>{category.name}</strong>
            <span>{category.challengeCount} challenges</span>
          </button>
        ))}
      </div>

      <div className="challenge-catalog-list">
        {challenges.map((challenge) => (
          <article key={challenge.challengeId}>
            <span>{challenge.level}</span>
            <h2>{challenge.title}</h2>
            <p>{challenge.time}</p>
            <button type="button" onClick={() => onPractice(challenge.challengeId)}>
              Practice
            </button>
          </article>
        ))}
        {activeCategory && challenges.length === 0 && (
          <p>No challenges are available in this track yet.</p>
        )}
      </div>
    </section>
  );
}

export default ChallengeCatalog;
