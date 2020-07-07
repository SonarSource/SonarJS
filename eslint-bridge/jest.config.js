module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  globals: {
    "ts-jest": {
      tsConfig: "tests/tsconfig.json"
    }
  },
  moduleFileExtensions: ["js", "ts", "json"],
  modulePathIgnorePatterns: ["<rootDir>/tests/fixtures/no-implicit-dependencies/bom-package-json-project/package.json"],
  testResultsProcessor: "jest-sonar-reporter",
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"]
};
