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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';
import pkg from '@angular-eslint/eslint-plugin';
import type { Rule } from 'eslint';

const { rules: upstreamRules } = pkg as unknown as { rules: Record<string, Rule.RuleModule> };

const compoundSelectorOutput = `
  @Directive({ selector: 'foo[bar]' })
  class Test {
    @Output('fooBarChanged') changed = new EventEmitter();
  }
`;

describe('S7653', () => {
  it('does not report an output alias derived from an element and its bare selector attribute', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S7653', rule, {
      valid: [
        { code: compoundSelectorOutput },
        {
          code: compoundSelectorOutput.replace('selector:', "'selector':"),
        },
        {
          code: `
            @Directive({ selector: 'foo[bar]' })
            class Test {
              changed = output({ alias: 'fooBarChanged' });
            }
          `,
        },
      ],
      invalid: [
        {
          code: `
            const metadata = { selector: '[other]' };
            @Directive({ selector: 'foo[bar]', ...metadata })
            class Test {
              @Output('fooBarChanged') changed = new EventEmitter();
            }
          `,
          errors: 1,
        },
        {
          code: `
            const key = 'selector';
            @Directive({ selector: 'foo[bar]', [key]: '[other]' })
            class Test {
              @Output('fooBarChanged') changed = new EventEmitter();
            }
          `,
          errors: 1,
        },
        {
          code: `
            @Directive({ selector: 'foo[bar]', 'selector': '[other]' })
            class Test {
              @Output('fooBarChanged') changed = new EventEmitter();
            }
          `,
          errors: 1,
        },
        {
          code: `
            @Directive({ selector: 'foo[bar][baz]' })
            class Test {
              @Output('fooBarChanged') changed = new EventEmitter();
            }
          `,
          errors: 1,
        },
        {
          code: `
            @Directive({ selector: 'foo[bar=value]' })
            class Test {
              @Output('fooBarChanged') changed = new EventEmitter();
            }
          `,
          errors: 1,
        },
        {
          code: `
            @Directive({ selector: 'foo[bar], baz' })
            class Test {
              @Output('fooBarChanged') changed = new EventEmitter();
            }
          `,
          errors: 1,
        },
        {
          code: `
            @Directive({ selector: '[bar]' })
            class Test {
              @Output('fooBarChanged') changed = new EventEmitter();
            }
          `,
          errors: 1,
        },
        {
          code: `
            @Directive({
              selector: 'foo[bar]',
              outputs: ['changed: fooBarChanged'],
            })
            class Test {}
          `,
          errors: 1,
        },
      ],
    });
  });

  it('relies on the upstream rule still reporting the compound-selector alias', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-output-rename', upstreamRules['no-output-rename'], {
      valid: [],
      invalid: [{ code: compoundSelectorOutput, errors: 1 }],
    });
  });
});
