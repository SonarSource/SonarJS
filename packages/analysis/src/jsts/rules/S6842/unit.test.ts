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
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const OPTIONS = [{ ul: ['listbox'], li: ['option'] }];

describe('S6842', () => {
  it('should not flag ul role="listbox" with li role="option" (valid WAI-ARIA composite widget)', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-noninteractive-element-to-interactive-role', rule, {
      valid: [
        {
          // ul/li listbox/option is a valid WAI-ARIA composite widget for accessible dropdowns
          code: `<ul role="listbox" aria-label="Select an option"><li role="option" aria-selected={false}>Item</li></ul>`,
          options: OPTIONS,
        },
        {
          code: `<ul role="listbox"><li role="option">Item</li></ul>`,
          options: OPTIONS,
        },
      ],
      invalid: [
        {
          // li role="button" is not a valid ARIA pattern — still reported
          code: `<li role="button">Foo</li>`,
          options: OPTIONS,
          errors: 1,
        },
      ],
    });
  });
});
