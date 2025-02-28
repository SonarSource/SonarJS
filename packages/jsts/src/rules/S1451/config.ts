/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1451/javascript

import { ESLintConfiguration } from '../helpers/configs.js';

export const fields = [
  [
    {
      field: 'headerFormat',
      type: 'string',
      description: 'Expected copyright and license header',
      default: '',
      fieldType: 'TEXT',
    },
    {
      field: 'isRegularExpression',
      type: 'boolean',
      description: 'Whether the headerFormat is a regular expression',
      default: false,
    },
  ],
] as const satisfies ESLintConfiguration;
