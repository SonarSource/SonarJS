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

const compoundSelectorOutputs = [compoundSelectorOutput, compoundSelectorSignal];
const selectorIdentityOutputs = compoundSelectorOutputs.map(code =>
  code.replace('fooBarChanged', 'fooBar'),
);

// Sentinel: upstream must still report both output APIs suppressed by the decorator.
describe('S7653 upstream sentinel', () => {
  it('reports compound-selector aliases with both output APIs', () => {
    new NoTypeCheckingRuleTester().run('no-output-rename', upstreamRules['no-output-rename'], {
      valid: [],
      invalid: [...compoundSelectorOutputs, ...selectorIdentityOutputs].map(code => ({
        code,
        errors: 1,
      })),
    });
  });
});

describe('S7653', () => {
  it('preserves existing upstream selector-derived exceptions', () => {
    new NoTypeCheckingRuleTester().run('S7653', rule, {
      valid: compoundSelectorOutputs.flatMap(code =>
        ['foobar', 'foobarChanged'].flatMap(alias => [
          { code: code.replace('fooBarChanged', alias) },
          { code: code.replace('fooBarChanged', alias).replace('@Directive', '@Component') },
        ]),
      ),
      invalid: [],
    });
  });

  it('permits exact compound-selector aliases only on unambiguous directives', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S7653', rule, {
      valid: [
        { code: compoundSelectorOutput },
        {
          code: compoundSelectorOutput.replace('selector:', "'selector':"),
        },
        { code: compoundSelectorSignal },
        ...selectorIdentityOutputs.map(code => ({ code })),
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
        ...[...compoundSelectorOutputs, ...selectorIdentityOutputs].flatMap(code => {
          const alias = code.includes('fooBarChanged') ? 'fooBarChanged' : 'fooBar';
          return [
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
            { code: code.replace("'foo[bar]'", 'selector'), errors: 1 },
            { code: code.replace("{ selector: 'foo[bar]' }", ''), errors: 1 },
            { code: code.replace("{ selector: 'foo[bar]' }", 'metadata'), errors: 1 },
            { code: code.replace("'foo[bar]'", '`foo[bar]`'), errors: 1 },
            { code: code.replace("@Directive({ selector: 'foo[bar]' })", ''), errors: 1 },
            { code: code.replace(`'${alias}'`, `\`${alias}\``), errors: 1 },
          ];
        }),
        ...compoundSelectorOutputs.flatMap(code =>
          ['fooBarUpdated', 'renamed'].map(alias => ({
            code: code.replace('fooBarChanged', alias),
            errors: 1,
          })),
        ),
        ...selectorIdentityOutputs.map(code => ({
          code: code.replace('changed =', 'fooBar ='),
          output: code
            .replace('changed =', 'fooBar =')
            .replace("@Output('fooBar')", '@Output()')
            .replace("output({ alias: 'fooBar' })", 'output()'),
          errors: 1,
        })),
        ...['fooBar', 'fooBarChanged'].flatMap(alias => [
          {
            code: `@Directive({ selector: 'foo[bar]' }) class Test {
              changed = output({ alias: '${alias}', ...options });
            }`,
            errors: 1,
          },
          {
            code: `@Directive({ selector: 'foo[bar]' }) class Test {
              changed = output({ alias: '${alias}', [key]: 'renamed' });
            }`,
            errors: 1,
          },
          {
            code: `@Directive({ selector: 'foo[bar]' }) class Test {
              changed = output({ alias: '${alias}', alias: 'renamed' });
            }`,
            errors: 2,
          },
          {
            code: `@Directive({ selector: 'foo[bar]' }) class Test {
              @Output('${alias}') @Output('renamed') changed = new EventEmitter();
            }`,
            errors: 2,
          },
          {
            code: `@Directive({ selector: 'foo[bar]' }) class Test {
              @Output('${alias}', options) changed = new EventEmitter();
            }`,
            errors: 1,
          },
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
