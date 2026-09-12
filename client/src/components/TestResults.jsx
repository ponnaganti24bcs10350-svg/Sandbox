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

      <p>{result.message}</p>
    </div>
  );
}

export default TestResults;