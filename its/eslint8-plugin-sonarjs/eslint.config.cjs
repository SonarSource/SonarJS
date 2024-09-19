const plugin = require('eslint-plugin-sonarjs');

console.log(`Loaded ${Object.keys(plugin.configs.recommended.rules).length} rules`);

module.exports = [
  {
    files: ['./*.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  plugin.configs.recommended,
  {
    rules: {
      'sonarjs/accessor-pairs': 'error',
      'sonarjs/no-implicit-dependencies': 'error',
    },
  },
];
