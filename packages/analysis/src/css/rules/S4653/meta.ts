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
import type { CssRuleDefinition } from '../types.js';

export const meta = {
  implementation: 'external',
  externalPlugin: 'stylelint',
  bindings: [
    {
      stylelintKey: 'unit-no-unknown',
      listParam: [
        {
          sqKey: 'ignoreFunctions',
          javaField: 'ignoreFunctions',
          description:
            'Comma-separated list of function names and/or regular expressions for functions whose arguments should be ignored.',
          default: 'image-set, spacer, spacing, size, rem, em, fluid',
          stylelintOptionKey: 'ignoreFunctions',
        },
      ],
    },
  ],
} satisfies CssRuleDefinition;
