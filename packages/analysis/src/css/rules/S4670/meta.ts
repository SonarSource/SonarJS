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
      stylelintKey: 'selector-type-no-unknown',
      listParam: [
        {
          sqKey: 'ignoreTypes',
          javaField: 'ignoreTypes',
          description:
            'Comma-separated list of regular expressions for selector types to consider as valid.',
          default: '/^(mat|md|fa)-/',
          stylelintOptionKey: 'ignoreTypes',
        },
        {
          sqKey: 'ignore',
          javaField: 'ignore',
          description:
            'Comma-separated list of ignored elements. The possible values are: "custom-elements": Allow custom elements (e.g "x-foo"). "default-namespace": Allow unknown type selectors if they belong to the default namespace.',
          default: 'custom-elements',
          stylelintOptionKey: 'ignore',
        },
      ],
    },
  ],
} satisfies CssRuleDefinition;
