module.exports = {
  testEnvironment: "node",
  testResultsProcessor: process.env.CI ? 'jest-junit' : null,
  collectCoverage: true,
};
