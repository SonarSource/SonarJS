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
export * from './generated-meta.js';
export const implementation = 'original';
export const eslintId = 'comment-regex';
export * from './config.js';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
export const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 1,
  items: [
    {
      type: 'object',
      properties: {
        regularExpression: {
          type: 'string',
        },
        message: {
          type: 'string',
        },
        flags: {
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  ],
} as const satisfies JSONSchema4;
