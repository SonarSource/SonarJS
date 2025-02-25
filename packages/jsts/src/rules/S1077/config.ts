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
// https://sonarsource.github.io/rspec/#/rspec/S1077/javascript

export const fields = [
  [
    {
      field: 'elements',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    {
      field: 'img',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    {
      field: 'object',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    {
      field: 'area',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    {
      field: 'input[type="image"]',
      type: 'array',
      items: {
        type: 'string',
      },
    },
  ],
];
