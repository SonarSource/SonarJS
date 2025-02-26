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
// https://sonarsource.github.io/rspec/#/rspec/S1192/javascript

export const fields = [
  [
    {
      field: 'threshold',
      type: 'integer',
      description: 'Number of times a literal must be duplicated to trigger an issue.',
      default: 3,
    },
    {
      field: 'ignoreStrings',
      type: 'string',
      description: 'Comma-separated list of strings that must be ignored.',
      default: 'application/json',
    },
  ],
];
