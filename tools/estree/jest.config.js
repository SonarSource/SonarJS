/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleDirectories: ['node_modules'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: ['<rootDir>/test/*.test.ts'],
  testTimeout: 20000,
};

module.exports = config;
