module.exports = {
  collectCoverageFrom: ['packages/**/*.ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tests/tsconfig.json',
    },
  },
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>/tests/**/fixtures'],
  moduleNameMapper: {
    '^@sonar/css$': '<rootDir>/packages/css/src',
    '^@sonar/html$': '<rootDir>/packages/html/src',
    '^@sonar/jsts$': '<rootDir>/packages/jsts/src',
    '^@sonar/yaml$': '<rootDir>/packages/yaml/src',
    '^@sonar/bridge/(.*)$': '<rootDir>/packages/bridge/src/$1',
    '^@sonar/css/(.*)$': '<rootDir>/packages/css/src/$1',
    '^@sonar/html/(.*)$': '<rootDir>/packages/html/src/$1',
    '^@sonar/jsts/(.*)$': '<rootDir>/packages/jsts/src/$1',
    '^@sonar/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@sonar/yaml/(.*)$': '<rootDir>/packages/yaml/src/$1',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/tests/linting/eslint/rules/fixtures/no-implicit-dependencies/bom-package-json-project/package.json',
  ],
  testResultsProcessor: 'jest-sonar-reporter',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testTimeout: 20000,
};
