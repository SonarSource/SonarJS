module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  globals: {
    "ts-jest": {
      skipBabel: false
    }
  },
  moduleFileExtensions: ["js", "ts"],
  testResultsProcessor: "jest-sonar-reporter",
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"]
};
