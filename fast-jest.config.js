/** @type {import('jest').Config} */
const config = {
  //  collectCoverageFrom: ['lib/*/src/**/*.ts'],
  coveragePathIgnorePatterns: ['.fixture.', '/fixtures/'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>lib/*/tests/**/fixtures'],
  moduleNameMapper: {
    '^@sonar/(\\w+)(.*)$': '<rootDir>/lib/$1/src$2',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/lib/jsts/src/rules/.*/package.json$',
    '<rootDir>/packages/jsts/src/rules/.*/package.json$',
  ],
  resolver: '<rootDir>/jest-resolver.js',
  testResultsProcessor: 'jest-sonar-reporter',
  testMatch: [
    '<rootDir>/lib/*/tests/**/*.test.js',
    '<rootDir>/lib/*/src/rules/**/*.test.js',
    '<rootDir>/lib/ruling/tests/projects/*.ruling.test.js',
  ],
  testTimeout: 20000,
};

module.exports = config;
