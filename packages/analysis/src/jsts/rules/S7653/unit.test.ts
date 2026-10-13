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
  class FooBarDirective {
    @Output('fooBarChanged') changed = new EventEmitter();
  }
`;

const compoundSelectorSignal = compoundSelectorOutput.replace(
  "@Output('fooBarChanged') changed = new EventEmitter();",
  "changed = output({ alias: 'fooBarChanged' });",
);

// Sentinel: upstream must still report both output APIs suppressed by the decorator.
describe('S7653 upstream sentinel', () => {
  it('reports compound-selector aliases with both output APIs', () => {
    new NoTypeCheckingRuleTester().run('no-output-rename', upstreamRules['no-output-rename'], {
      valid: [],
      invalid: [compoundSelectorOutput, compoundSelectorSignal].map(code => ({ code, errors: 1 })),
    });
  });
});

describe('S7653', () => {
  it('permits exact compound-selector aliases only on unambiguous directives', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S7653', rule, {
      valid: [
        { code: compoundSelectorOutput },
        {
          code: compoundSelectorOutput.replace('selector:', "'selector':"),
        },
        { code: compoundSelectorSignal },
        {
          code:
            compoundSelectorOutput +
            compoundSelectorSignal
              .replaceAll('foo[bar]', 'foo[baz]')
              .replaceAll('fooBarChanged', 'fooBazChanged')
              .replaceAll('FooBarDirective', 'FooBazDirective'),
        },
      ],
      invalid: [
        ...[compoundSelectorOutput, compoundSelectorSignal].flatMap(code => [
          { code: code.replace('@Directive', '@Component'), errors: 1 },
          {
            code: "@Component({ selector: 'foo[bar]' })" + code,
            errors: 1,
          },
          {
            code: code.replace(
              'class FooBarDirective',
              "@Component({ selector: 'foo[bar]' }) class FooBarDirective",
            ),
            errors: 1,
          },
          {
            code: "@Directive({ selector: 'foo[bar]' })" + code,
            errors: 1,
          },
          { code: code.replace('changed =', '[changed] ='), errors: 1 },
          { code: code.replace('fooBarChanged', 'fooBarUpdated'), errors: 1 },
          { code: code.replace('fooBarChanged', 'renamed'), errors: 1 },
          { code: code.replace("'foo[bar]'", 'selector'), errors: 1 },
          { code: code.replace("{ selector: 'foo[bar]' }", ''), errors: 1 },
          { code: code.replace("{ selector: 'foo[bar]' }", 'metadata'), errors: 1 },
          { code: code.replace("'foo[bar]'", '`foo[bar]`'), errors: 1 },
          { code: code.replace("@Directive({ selector: 'foo[bar]' })", ''), errors: 1 },
          { code: code.replace("'fooBarChanged'", '`fooBarChanged`'), errors: 1 },
        ]),
        {
          code:
            compoundSelectorOutput +
            compoundSelectorSignal
              .replace('@Directive', '@Component')
              .replace('FooBarDirective', 'FooBarComponent'),
          errors: 1,
        },
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
});
