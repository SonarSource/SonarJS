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
// https://sonarsource.github.io/rspec/#/rspec/S9452/css
import type { CssRuleDefinition } from '../types.js';

export const meta = {
  implementation: 'decorated',
  bindings: [
    {
      stylelintKey: 'sonar/media-feature-name-value-no-unknown',
      cssOnly: true,
      upstreamRule: 'media-feature-name-value-no-unknown',
    },
  ],
} satisfies CssRuleDefinition;
