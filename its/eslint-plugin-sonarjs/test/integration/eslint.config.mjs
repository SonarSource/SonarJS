import plugin from 'eslint-plugin-sonarjs';

export default [
  {
    files: ['./*.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  plugin.configs.recommended,
];
