// @ts-check

import plugin from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';
import parser from '@typescript-eslint/parser';

console.log(`Loaded ${Object.keys(plugin.configs.recommended.rules ?? {}).length} rules`);

export default tseslint.config(plugin.configs.recommended, {
  files: ['**/*.ts'],
  languageOptions: {
    parser,
  },
});
