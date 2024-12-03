/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
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
