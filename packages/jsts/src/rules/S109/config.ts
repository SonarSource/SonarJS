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

export const fields = [
  [
    {
      field: 'detectObjects',
      type: 'boolean',
    },
    {
      field: 'enforceConst',
      type: 'boolean',
    },
    {
      field: 'ignore',
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'number',
          },
          {
            type: 'string',
            pattern: '^[+-]?(?:0|[1-9][0-9]*)n$',
          },
        ],
      },
    },
    {
      field: 'ignoreArrayIndexes',
      type: 'boolean',
    },
    {
      field: 'ignoreDefaultValues',
      type: 'boolean',
    },
    {
      field: 'ignoreClassFieldInitialValues',
      type: 'boolean',
    },
    {
      field: 'ignoreEnums',
      type: 'boolean',
    },
    {
      field: 'ignoreNumericLiteralTypes',
      type: 'boolean',
    },
    {
      field: 'ignoreReadonlyClassProperties',
      type: 'boolean',
    },
    {
      field: 'ignoreTypeIndexes',
      type: 'boolean',
    },
  ],
];
