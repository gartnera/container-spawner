module.exports = {
  testResultsProcessor: process.env.CI ? 'jest-junit' : null,
  collectCoverage: true,
};
