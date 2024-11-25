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
      'sonarjs/no-implicit-dependencies': 'error',
    },
  },
];
