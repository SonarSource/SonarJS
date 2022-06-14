module.exports = {
  collectCoverageFrom: ['src/**/*.ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tests/tsconfig.json',
    },
  },
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/tests/fixtures', '<rootDir>/tests/comments-based', '<rootDir>/tests/testing-framework/fixtures'],
  modulePathIgnorePatterns: [
    '<rootDir>/tests/fixtures/no-implicit-dependencies/bom-package-json-project/package.json',
  ],
  testResultsProcessor: 'jest-sonar-reporter',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
