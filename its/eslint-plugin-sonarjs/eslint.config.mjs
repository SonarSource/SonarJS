import plugin from 'eslint-plugin-sonarjs';

console.log(`Loaded ${Object.keys(plugin.configs.recommended.rules).length} rules`);

export default [
  {
    files: ['./*.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  plugin.configs.recommended,
  { rules: { 'sonarjs/accessor-pairs': 'error' } },
];
