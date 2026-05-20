/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6842/javascript

import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import type { ESLintConfiguration } from '../helpers/configs.js';

type Allowlist = Record<string, string[]>;

const { configs } = jsxA11yPlugin as unknown as {
  configs: {
    recommended: {
      rules: Record<string, [string, Allowlist]>;
    };
  };
};

const allowlist =
  configs.recommended.rules['jsx-a11y/no-noninteractive-element-to-interactive-role'][1];

export const fields = [
  Object.entries(allowlist).map(([field, roles]) => ({
    field,
    default: roles,
  })),
] as const satisfies ESLintConfiguration;
