import { useEffect, useState } from "react";

function PracticedChallenges({ onPractice }) {
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPracticedChallenges() {
      try {
        setError("");

        const token = localStorage.getItem("token");

        const response = await fetch(
          "https://sandbox-10.onrender.com/api/progress/practiced",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to fetch practiced challenges"
          );
        }

        setChallenges(result.data || []);
      } catch (error) {
        console.error(
          "Failed to fetch practiced challenges:",
          error
        );

        setError(
          error.message ||
            "Unable to connect to server"
        );
      }
    }

    fetchPracticedChallenges();
  }, []);

  return (
    <div className="practiced-page">
      <h1>Practiced Challenges</h1>

      {error ? (
        <div className="practiced-error">
          <p>Unable to load practiced challenges.</p>
          <p>{error}</p>
        </div>
      ) : challenges.length === 0 ? (
        <p>You haven't solved any challenges yet.</p>
      ) : (
        <div className="practiced-list">
          {challenges.map((challenge) => (
            <div
              className="practiced-card"
              key={challenge.challengeId}
            >
              <h2>{challenge.title}</h2>

              <p>{challenge.description}</p>

              <button
                onClick={() => onPractice(challenge)}
              >
                Practice Again
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PracticedChallenges;