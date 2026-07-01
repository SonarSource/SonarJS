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
// https://sonarsource.github.io/rspec/#/rspec/S6478/javascript

import type { ESLintConfiguration } from '../helpers/configs.js';

export const fields = [
  [
    {
      field: 'allowAsProps',
      default: false,
      description:
        'Allow React components defined inline when they are passed as props. Use this broad escape hatch when propNamePattern is not precise enough.',
    },
    {
      field: 'propNamePattern',
      default: 'render*',
      description:
        'Glob pattern matching prop names whose inline functions should be treated as render props rather than nested components.',
      displayName: 'propNamePattern',
    },
  ],
] as const satisfies ESLintConfiguration;
