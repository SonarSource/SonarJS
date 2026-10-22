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
  implementation: 'decorated',
  bindings: [
    {
      stylelintKey: 'sonar/annotation-no-unknown',
      listParam: [
        {
          sqKey: 'ignoreAnnotations',
          javaField: 'ignoreAnnotations',
          description:
            'Comma-separated list of strings and/or regular expressions for annotations to consider as valid.',
          default: '',
          stylelintOptionKey: 'ignoreAnnotations',
        },
      ],
      upstreamRule: 'annotation-no-unknown',
    },
  ],
} satisfies CssRuleDefinition;
