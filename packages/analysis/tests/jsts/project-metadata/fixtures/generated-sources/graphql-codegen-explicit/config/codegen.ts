const config = {
  generates: {
    '../src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
    '../build/generated/ignored.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
