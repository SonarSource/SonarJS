module.exports = {
  collectCoverageFrom: ['packages/*/src/**/*.ts'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>packages/*/tests/**/fixtures'],
  moduleNameMapper: {
    '^@sonar/(\\w+)(.*)$': '<rootDir>/packages/$1/src$2',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/packages/jsts/tests/rules/fixtures/no-implicit-dependencies/bom-package-json-project/package.json',
  ],
  testResultsProcessor: 'jest-sonar-reporter',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'packages/tsconfig.test.json' }],
  },
  testMatch: ['<rootDir>/packages/*/tests/**/*.test.ts'],
  testTimeout: 20000,
};
