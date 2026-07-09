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
// https://sonarsource.github.io/rspec/#/rspec/S8980/javascript

import type { ESLintConfiguration } from '../helpers/configs.js';

// The upstream rule defaults to `isStrict: true`, which flags an `act(...)` callback
// as soon as ANY statement inside it is a Testing Library call, even mixed with
// unrelated code. RSPEC-8980 only covers callbacks made entirely of Testing Library
// calls, so `isStrict` is forced to `false` here. No `description` is provided so
// this is not exposed as a configurable SonarQube property.
export const fields = [
  [
    {
      field: 'isStrict',
      default: false,
    },
  ],
] as const satisfies ESLintConfiguration;
