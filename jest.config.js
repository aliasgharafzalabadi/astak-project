const shared = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  clearMocks: true,
};

module.exports = {
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/worker.js', '!src/scripts/**'],
  projects: [
    {
      ...shared,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
    },
    {
      ...shared,
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testTimeout: 30000,
    },
  ],
};
