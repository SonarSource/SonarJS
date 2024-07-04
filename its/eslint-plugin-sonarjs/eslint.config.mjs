import plugin from 'eslint-plugin-sonarjs';

console.log(plugin.configs.recommended);

export default [
  {
    files: ['./*.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  plugin.configs.recommended,
];
