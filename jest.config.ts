import { createDefaultEsmPreset } from 'ts-jest';
const defaultEsmPreset = createDefaultEsmPreset();

const config = {
  ...defaultEsmPreset,
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  collectCoverageFrom: ['packages/*/src/**/*.ts'],
  coveragePathIgnorePatterns: ['.fixture.', '/fixtures/'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>packages/*/tests/**/fixtures'],
  moduleNameMapper: {
    // '^@sonar/(\\w+)(.*)$': '<rootDir>/packages/$1/src$2',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // "(.+)\\.js": "$1",
  },
  modulePathIgnorePatterns: ['<rootDir>/packages/jsts/src/rules/.*/package.json$', '<rootDir>/its'],
  // resolver: '<rootDir>/jest-resolver.cjs',
  testResultsProcessor: 'jest-sonar-reporter',
  // transform: {
  //   // '^.+\\.ts$': ['ts-jest', { tsconfig: 'packages/tsconfig.test.json' }],
  // },
  transform: {
    '^.+\\.[tj]s?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'packages/tsconfig.test.json',
      },
    ],
  },
  testMatch: [
    '<rootDir>/packages/*/tests/**/*.test.ts',
    '<rootDir>/packages/*/src/rules/**/*.test.ts',
    '<rootDir>/packages/ruling/tests/projects/*.ruling.test.ts',
  ],
  testTimeout: 20000,
  extensionsToTreatAsEsm: ['.ts'],
};

export default config;
