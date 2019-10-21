module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  globals: {
    "ts-jest": {
      tsConfig: "tests/tsconfig.json"
    }
  },
  moduleFileExtensions: ["js", "ts", "json"],
  testResultsProcessor: "jest-sonar-reporter",
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"]
};
