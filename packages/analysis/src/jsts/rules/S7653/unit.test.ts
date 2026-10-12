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
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import type { Rule } from 'eslint';
import parser from '@typescript-eslint/parser';
import pkg from '@angular-eslint/eslint-plugin';
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

/**
 * Analyzes TypeScript with the real Angular output rules.
 * @param code the source to analyze
 * @param outputRule the output-alias rule implementation
 * @param checkNative whether to enable the native-output rule too
 * @return the reported ESLint findings
 */
function analyze(code: string, outputRule = rule, checkNative = false): Linter.LintMessage[] {
  return new Linter().verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: { parser },
      plugins: { sonar: { rules: { S7653: outputRule, S7651: nativeOutputRule } } },
      rules: { 'sonar/S7653': 'error', ...(checkNative ? { 'sonar/S7651': 'error' } : {}) },
    },
    { filename: 'component.ts' },
  );
}

describe('S7653', () => {
  for (const api of apis) {
    for (const quote of ["'", '"', '`']) {
      for (const member of [
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
      ]) {
        it(`allows ${api} ${quote} aliases avoiding the native ${member} event`, () => {
          const code = outputCode(api, member, 'componentEvent', quote);
          const baseline = analyze(code, upstreamRule);
          assert.equal(baseline.length, 1);
          assert.equal(baseline[0].messageId, 'noOutputRename');
          assert.deepEqual(analyze(code), []);
        });
      }
      for (const [member, alias] of [
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
      ]) {
        it(`preserves ${api} ${quote} findings for ${member} → ${alias}`, () => {
          const code = outputCode(api, member, alias, quote);
          const findings = analyze(code);
          assert.equal(findings.length, 1);
          assert.equal(findings[0].messageId, 'noOutputRename');
          assert.deepEqual(findings, analyze(code, upstreamRule));
        });
      }
    }

    it(`preserves selector-derived ${api} exemptions`, () => {
      for (const [selector, prefix] of [
        ['app-test', 'app-test'],
        ['[appTest]', 'appTest'],
        ['app-test, [appTest]', 'appTest'],
      ]) {
        for (const alias of [prefix, `${prefix}Changed`]) {
          const code = outputCode(api, 'changed', alias).replace(
            "selector: 'app-test'",
            `selector: '${selector}'`,
          );
          assert.deepEqual(analyze(code), analyze(code, upstreamRule));
          assert.deepEqual(analyze(code), []);
        }
      }
    });

    it(`preserves dynamic ${api} aliases`, () => {
      const code = outputCode(api, 'change', 'component${suffix}', '`');
      const baseline = analyze(code, upstreamRule);
      assert.ok(baseline.length > 0);
      assert.deepEqual(analyze(code), baseline);
    });

    it(`retains native-output findings for ${api} native public aliases`, () => {
      const code = outputCode(api, 'changeEvent', 'change');
      const findings = analyze(code, rule, true);
      assert.deepEqual(findings, analyze(code, upstreamRule, true));
      assert.equal(findings.filter(finding => finding.ruleId === 'sonar/S7653').length, 1);
      assert.equal(findings.filter(finding => finding.ruleId === 'sonar/S7651').length, 1);
    });
  }

  it('preserves hostDirectives composition aliases', () => {
    const code = `@Component({
      hostDirectives: [{ directive: Other, outputs: ['changed: updated', 'change: click'] }],
    }) class Test {}`;
    assert.deepEqual(analyze(code), []);
  });

  it('allows getter outputs and directive metadata aliases', () => {
    const getter = `class Test { @Output('valueChanged') get change() { return new EventEmitter(); } }`;
    const directive = `@Directive({ outputs: [' submit : submitted '] }) class Test {}`;
    for (const code of [getter, directive]) {
      assert.equal(analyze(code, upstreamRule).length, 1);
      assert.deepEqual(analyze(code), []);
    }
  });

  it('preserves unsupported computed and quoted output members', () => {
    for (const member of ["['change']", "'change'", '[eventName]']) {
      const code = outputCode('output', member, 'valueChanged');
      assert.deepEqual(analyze(code), analyze(code, upstreamRule));
    }
  });

  it('does not infer static names from nested metadata or malformed aliases', () => {
    for (const alias of ['change: valueChanged: extra', 'ch ange: valueChanged']) {
      const code = `@Component({ outputs: ['${alias}'] }) class Test {}`;
      assert.deepEqual(analyze(code), analyze(code, upstreamRule));
    }
    const nested = `@Component({ outputs: [['change: valueChanged']] }) class Test {}`;
    assert.deepEqual(analyze(nested), analyze(nested, upstreamRule));
  });

  it('uses cooked static template text when the public alias is an escaped native name', () => {
    for (const api of apis) {
      const code = outputCode(api, 'change', String.raw`\u0063lick`, '`');
      assert.equal(analyze(code).length, 1);
      assert.deepEqual(analyze(code), analyze(code, upstreamRule));
    }
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
    const baseline = analyze(code, upstreamRule);
    assert.equal(baseline.length, 8);
    const findings = analyze(code);
    assert.deepEqual(
      findings,
      baseline.filter(
        finding =>
          ![
            "'change: valueChanged'",
            "'click: activated'",
            "'valueChanged'",
            "'activated'",
          ].includes(
            code.split('\n')[finding.line - 1].slice(finding.column - 1, finding.endColumn! - 1),
          ),
      ),
    );
    assert.equal(findings.length, 4);
    assert.deepEqual(
      findings.map(({ line, column, endColumn, messageId }) => ({
        line,
        column,
        endColumn,
        messageId,
      })),
      [
        { line: 2, column: 31, endColumn: 53, messageId: 'noOutputRename' },
        { line: 2, column: 75, endColumn: 90, messageId: 'noOutputRename' },
        { line: 5, column: 37, endColumn: 46, messageId: 'noOutputRename' },
        { line: 7, column: 15, endColumn: 22, messageId: 'noOutputRename' },
      ],
    );
  });
});
