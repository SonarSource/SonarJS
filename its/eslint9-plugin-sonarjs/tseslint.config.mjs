// @ts-check

import plugin from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

console.log(`Loaded ${Object.keys(plugin.configs.recommended.rules ?? {}).length} rules`);

export default tseslint.config(plugin.configs.recommended);
