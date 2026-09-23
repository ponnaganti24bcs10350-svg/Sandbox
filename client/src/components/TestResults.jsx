function TestResults({ result, isRunning }) {
  if (isRunning) {
    return (
      <div className="test-results">
        <p>⏳ Running tests...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="test-results">
        <p>Click Run to test your solution.</p>
      </div>
    );
  }

  return (
    <div className="test-results">
      <h3>
        {result.passed ? "✅ Tests Passed" : "❌ Tests Failed"}
      </h3>

      {result.testsPassed !== undefined && (
        <p>
          Tests: {result.testsPassed} / {result.totalTests}
        </p>
      )}

      {result.passed ? (
        <p>{result.message}</p>
      ) : (
        <>
          <p>
            Your implementation does not yet satisfy all required
            behaviours.
          </p>

          {result.failureAreas?.length > 0 && (
            <div className="failure-areas">
              <h4>Areas that need investigation</h4>

              <ul>
                {result.failureAreas.map((area) => (
                  <li key={area}>
                    <strong>❌ {area}</strong>
                    <span>
                      Some behaviours in this area are not currently
                      satisfied.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TestResults;