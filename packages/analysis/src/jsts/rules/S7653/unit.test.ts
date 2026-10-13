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
import { describe, it } from 'node:test';
import type { Rule, RuleTester } from 'eslint';
import pkg from '@angular-eslint/eslint-plugin';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import { rule } from './index.js';
import { rule as nativeOutputRule } from '../S7651/index.js';

const upstreamRule = (pkg as unknown as { rules: Record<string, Rule.RuleModule> }).rules[
  'no-output-rename'
];
const apis = ['output', 'decorator', 'metadata'] as const;
type OutputAPI = (typeof apis)[number];

/**
 * Creates an Angular output declaration using a supported API.
 * @param api the output declaration syntax
 * @param member the TypeScript member name
 * @param alias the public output name
 * @param quote the string delimiter
 * @return the Angular component source
 */
function outputCode(api: OutputAPI, member: string, alias: string, quote = "'"): string {
  const aliasText = `${quote}${api === 'metadata' ? `${member}: ${alias}` : alias}${quote}`;
  const metadata = api === 'metadata' ? `, outputs: [${aliasText}]` : '';
  let declaration = `${member} = output({ alias: ${aliasText} });`;
  if (api === 'decorator') {
    declaration = `@Output(${aliasText}) ${member} = new EventEmitter();`;
  } else if (api === 'metadata') {
    declaration = `${member} = new EventEmitter();`;
  }
  return `import { Component, EventEmitter, Output, output } from '@angular/core';
@Component({ selector: 'app-test', template: ''${metadata} })
class Test {
  ${declaration}
}`;
}

/** Checks a retained finding, its location, and the upstream removal suggestions. */
function retainedAliasCase(
  api: OutputAPI,
  member: string,
  alias: string,
  quote: string,
): RuleTester.InvalidTestCase {
  const code = outputCode(api, member, alias, quote);
  const aliasText = `${quote}${api === 'metadata' ? `${member}: ${alias}` : alias}${quote}`;
  const replacementQuote = quote === '`' ? '`' : "'";
  const removed =
    api === 'metadata'
      ? code.replace(aliasText, `${replacementQuote}${member}${replacementQuote}`)
      : api === 'output'
        ? code.replace(`{ alias: ${aliasText} }`, '')
        : code.replace(`@Output(${aliasText})`, '@Output()');
  const renamed =
    api === 'metadata'
      ? code.replace(aliasText, `${replacementQuote}${alias}${replacementQuote}`)
      : removed.replace(`${member} =`, `${alias} =`);
  const line = api === 'metadata' ? 2 : 4;
  const column = code.split('\n')[line - 1].indexOf(aliasText) + 1;
  return {
    code,
    errors: [
      {
        messageId: 'noOutputRename',
        line,
        column,
        endLine: line,
        endColumn: column + aliasText.length,
        suggestions:
          member === alias
            ? []
            : [
                { messageId: 'suggestRemoveAliasName', output: removed },
                { messageId: 'suggestReplaceOriginalNameWithAliasName', output: renamed },
              ],
      },
    ],
    output: member === alias ? removed : null,
  };
}

const compoundSelectorOutput = `
  @Directive({ selector: 'foo[bar]' })
  class Test {
    @Output('fooBarChanged') changed = new EventEmitter();
  }
`;

describe('S7653', () => {
  const ruleTester = new NoTypeCheckingRuleTester();

  it('does not report an output alias derived from an element and its bare selector attribute', () => {
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
    ruleTester.run('no-output-rename', upstreamRule, {
      valid: [],
      invalid: [{ code: compoundSelectorOutput, errors: 1 }],
    });
  });

  it('applies both independent alias exceptions in the same class', () => {
    const invalid = ['Component', 'Directive'].flatMap(decorator =>
      ['output', 'decorator'].map(api => {
        const declaration = (member: string, alias: string) =>
          api === 'output'
            ? `${member} = output({ alias: '${alias}' });`
            : `@Output('${alias}') ${member} = new EventEmitter();`;
        return {
          code: `@${decorator}({ selector: 'foo[bar]' }) class Test {
            ${declaration('change', 'valueChanged')}
            ${declaration('changed', 'fooBarChanged')}
            ${declaration('valueChange', 'updated')}
          }`,
          errors: 1,
        };
      }),
    );
    ruleTester.run('S7653', rule, { valid: [], invalid });
    ruleTester.run('no-output-rename', upstreamRule, {
      valid: [],
      invalid: invalid.map(test => ({ ...test, errors: 3 })),
    });
  });

  it('handles static quoted outputs metadata keys', () => {
    const cases = ['Component', 'Directive'].flatMap(decorator =>
      ["'outputs'", '\"outputs\"', "['outputs']"].map(key => {
        const code = (member: string, alias: string) =>
          outputCode('metadata', member, alias)
            .replace('@Component(', `@${decorator}(`)
            .replace('outputs:', `${key}:`);

        return {
          valid: { code: code('change', 'valueChanged') },
          invalid: { code: code('valueChange', 'updated'), errors: 1 },
        };
      }),
    );
    ruleTester.run('S7653', rule, {
      valid: cases.map(test => test.valid),
      invalid: cases.map(test => test.invalid),
    });
    ruleTester.run('no-output-rename', upstreamRule, {
      valid: [],
      invalid: [
        ...cases.map(test => ({ ...test.valid, errors: 1 })),
        ...cases.map(test => test.invalid),
      ],
    });
  });

  it('allows exact native member names and retains other aliases across all output APIs', () => {
    const collisionCases = apis.flatMap(api =>
      ["'", '"', '`'].flatMap(quote =>
        [
          'change',
          'click',
          'submit',
          'pointerdown',
          'animationend',
          'beforeunload',
          'selectionchange',
          'beginEvent',
          'afterscriptexecute',
          'webkitmouseforcechanged',
          'beforexrselect',
        ].map(member => ({ code: outputCode(api, member, 'componentEvent', quote) })),
      ),
    );
    const retainedCases = apis.flatMap(api =>
      ["'", '"', '`'].flatMap(quote =>
        [
          ['valueChange', 'updated'],
          ['changeEvent', 'change'],
          ['change', 'click'],
          ['change', 'change'],
          ['valueChange', 'valueChange'],
          ['$change', 'valueChanged'],
          ['_change', 'valueChanged'],
          ['onChange', 'valueChanged'],
          ['Change', 'valueChanged'],
          ['beginevent', 'componentEvent'],
        ].map(([member, alias]) => retainedAliasCase(api, member, alias, quote)),
      ),
    );
    ruleTester.run('S7653', rule, { valid: collisionCases, invalid: retainedCases });
    ruleTester.run('no-output-rename', upstreamRule, {
      valid: [],
      invalid: [...collisionCases.map(test => ({ ...test, errors: 1 })), ...retainedCases],
    });
  });

  it('preserves selector and hostDirectives exemptions', () => {
    const valid = [
      ...apis.flatMap(api =>
        [
          ['app-test', 'app-test'],
          ['[appTest]', 'appTest'],
          ['app-test, [appTest]', 'appTest'],
        ].flatMap(([selector, prefix]) =>
          [prefix, `${prefix}Changed`].map(alias => ({
            code: outputCode(api, 'changed', alias).replace(
              "selector: 'app-test'",
              `selector: '${selector}'`,
            ),
          })),
        ),
      ),
      {
        code: `@Component({
          hostDirectives: [{ directive: Other, outputs: ['changed: updated', 'change: click'] }],
        }) class Test {}`,
      },
    ];
    ruleTester.run('S7653', rule, { valid, invalid: [] });
    ruleTester.run('no-output-rename', upstreamRule, { valid, invalid: [] });
  });

  it('allows getter and directive mappings with static, decoded names', () => {
    const valid = [
      {
        code: `class Test { @Output('valueChanged') get change() { return new EventEmitter(); } }`,
      },
      { code: `@Directive({ outputs: [' submit : submitted '] }) class Test {}` },
      { code: `@Directive({ outputs: [' click : activated '] }) class Test {}` },
      { code: `@Directive({ outputs: ['${String.raw`\u0063lick: activated`}'] }) class Test {}` },
    ];
    ruleTester.run('S7653', rule, { valid, invalid: [] });
    ruleTester.run('no-output-rename', upstreamRule, {
      valid: [],
      invalid: valid.map(test => ({ ...test, errors: 1 })),
    });
  });

  it('preserves unsupported members and malformed or nested mappings', () => {
    const valid = ["['change']", "'change'"].map(member => ({
      code: outputCode('output', member, 'valueChanged'),
    }));
    const invalid = [
      {
        code: outputCode('output', '[eventName]', 'valueChanged'),
        errors: 1,
      },
      ...['change: valueChanged: extra', 'ch ange: valueChanged'].map(mapping => ({
        code: `@Component({ outputs: ['${mapping}'] }) class Test {}`,
        errors: 1,
      })),
      { code: `@Component({ outputs: [['change: valueChanged']] }) class Test {}`, errors: 1 },
    ];
    ruleTester.run('S7653', rule, { valid, invalid });
    ruleTester.run('no-output-rename', upstreamRule, { valid, invalid });
  });

  it('retains dynamic template aliases and escaped native public names', () => {
    const invalid = [
      ...apis.map(api => ({
        code: outputCode(api, 'change', 'component${suffix}', '`'),
        errors: api === 'metadata' ? 1 : 2,
      })),
      ...apis.map(api => ({
        code: outputCode(api, 'change', String.raw`\u0063lick`, '`'),
        errors: 1,
      })),
    ];
    ruleTester.run('S7653', rule, { valid: [], invalid });
    ruleTester.run('no-output-rename', upstreamRule, { valid: [], invalid });
  });

  it('preserves literals nested inside dynamic alias expressions', () => {
    const invalid = [
      { expression: "EVENT_NAMES['pressed']", errors: 1 },
      { expression: '`cli` + `ck`', errors: 2 },
      { expression: "'cli' + 'ck'", errors: 2 },
      { expression: "condition ? 'click' : 'pressed'", errors: 2 },
      { expression: "getAlias('pressed')", errors: 1 },
      { expression: "{ alias: 'pressed' }", errors: 1 },
      { expression: "['pressed'][0]", errors: 2 },
      { expression: "{ names: ['change: pressed'] }", errors: 1 },
      { expression: "{ outputs: ['change: pressed'] }", errors: 1 },
      { expression: '{ names: [`change: pressed`] }', errors: 1 },
    ].flatMap(({ expression, errors }) =>
      [
        `@Output(${expression}) change = new EventEmitter();`,
        `change = output({ alias: ${expression} });`,
      ].map(declaration => ({
        code: `const EVENT_NAMES = { pressed: 'click' }; class Test { ${declaration} }`,
        errors,
      })),
    );
    ruleTester.run('S7653', rule, { valid: [], invalid });
    ruleTester.run('no-output-rename', upstreamRule, { valid: [], invalid });
  });

  it('retains native-output reports when both rules analyze a declaration', () => {
    const combinedRule: Rule.RuleModule = {
      meta: {
        ...rule.meta,
        messages: { ...rule.meta!.messages, ...nativeOutputRule.meta!.messages },
      },
      create: context => mergeRules(rule.create(context), nativeOutputRule.create(context)),
    };
    ruleTester.run('S7653 + S7651', combinedRule, {
      valid: [],
      invalid: apis.map(api => ({
        code: outputCode(api, 'changeEvent', 'change'),
        errors: 2,
      })),
    });
    ruleTester.run('S7651', nativeOutputRule, {
      valid: [],
      invalid: apis.map(api => ({
        code: outputCode(api, 'changeEvent', 'change'),
        errors: 1,
      })),
    });
  });

  it('removes only collision-avoiding reports from mixed declarations and metadata', () => {
    const code = `@Component({ outputs: [
      'change: valueChanged', 'valueChange: updated', 'click: activated', 'change: click',
    ] }) class Test {
      change = output({ alias: 'valueChanged' });
      valueChange = output({ alias: 'updated' });
      @Output('activated') click = new EventEmitter();
      @Output('click') changeEvent = new EventEmitter();
    }`;
    const locations = [
      {
        line: 2,
        column: 31,
        endColumn: 53,
        from: "'valueChange: updated'",
        to: "'valueChange'",
        alias: "'updated'",
      },
      {
        line: 2,
        column: 75,
        endColumn: 90,
        from: "'change: click'",
        to: "'change'",
        alias: "'click'",
      },
      {
        line: 5,
        column: 37,
        endColumn: 46,
        from: "{ alias: 'updated' }",
        to: '',
        member: 'valueChange',
        alias: 'updated',
      },
      {
        line: 7,
        column: 15,
        endColumn: 22,
        from: "@Output('click')",
        to: '@Output()',
        member: 'changeEvent',
        alias: 'click',
      },
    ];
    ruleTester.run('S7653', rule, {
      valid: [],
      invalid: [
        {
          code,
          errors: locations.map(({ line, column, endColumn, from, to, member, alias }) => {
            const removed = code.replace(from, to);
            const renamed = member
              ? removed.replace(`${member} =`, `${alias} =`)
              : code.replace(from, alias);
            return {
              messageId: 'noOutputRename',
              line,
              column,
              endLine: line,
              endColumn,
              suggestions: [
                { messageId: 'suggestRemoveAliasName', output: removed },
                { messageId: 'suggestReplaceOriginalNameWithAliasName', output: renamed },
              ],
            };
          }),
        },
      ],
    });
    ruleTester.run('no-output-rename', upstreamRule, {
      valid: [],
      invalid: [{ code, errors: 8 }],
    });
  });
});
