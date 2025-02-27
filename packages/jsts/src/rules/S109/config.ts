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
// https://sonarsource.github.io/rspec/#/rspec/S109/javascript

import { ESLintConfiguration } from '../helpers/configs.js';

export const fields = [
  [
    {
      field: 'ignore',
      type: 'array',
      items: {
        type: 'integer',
      },
      default: [0, 1, -1, 24, 60],
    },
    {
      field: 'ignoreDefaultValues',
      type: 'boolean',
      default: true,
    },
    {
      field: 'ignoreClassFieldInitialValues',
      type: 'boolean',
      default: true,
    },
    {
      field: 'ignoreEnums',
      type: 'boolean',
      default: true,
    },
    {
      field: 'ignoreNumericLiteralTypes',
      type: 'boolean',
      default: true,
    },
    {
      field: 'ignoreReadonlyClassProperties',
      type: 'boolean',
      default: true,
    },
  ],
] as const satisfies ESLintConfiguration;
