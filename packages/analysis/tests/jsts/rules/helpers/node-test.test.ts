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
import { expect } from 'expect';
import { Linter, type Rule } from 'eslint';
import type estree from 'estree';
import { isAssertion } from '../../../../src/jsts/rules/helpers/testing/node-test.js';

/** The calls `isAssertion` recognizes in `source`, as source text. */
function detected(source: string): string[] {
  const found: string[] = [];
  const collect: Rule.RuleModule = {
    create: context => ({
      CallExpression(node: estree.CallExpression) {
        if (isAssertion(context, node)) {
          found.push(context.sourceCode.getText(node));
        }
      },
    }),
  };
  new Linter().verify(
    source,
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: { test: { rules: { collect } } },
      rules: { 'test/collect': 'error' },
    },
    { filename: 'a.test.js' },
  );
  return found;
}

describe('node:test context assertions', () => {
  it('recognizes assertions on the context parameter of every entry point', () => {
    expect(
      detected(`
import test, { it } from 'node:test';
test('default export', t => { t.assert.equal(a, b); });
it('named export', ctx => { ctx.assert.ok(value); });
`),
    ).toEqual(['t.assert.equal(a, b)', 'ctx.assert.ok(value)']);
  });

  it('recognizes assertions nested inside the callback', () => {
    expect(
      detected(`
import test from 'node:test';
test('nested', async t => {
  for (const c of cases) {
    if (c) { t.assert.deepStrictEqual(c, expected); }
  }
});
`),
    ).toEqual(['t.assert.deepStrictEqual(c, expected)']);
  });

  it('ignores a receiver that is not the context parameter', () => {
    // Same shape, but `helper` is a local object and `t` here is an ordinary parameter of a
    // function nobody passed to node:test.
    expect(
      detected(`
import test from 'node:test';
test('lookalikes', () => {
  const helper = { assert: { equal() {} } };
  helper.assert.equal(a, b);
});
function standalone(t) { t.assert.equal(a, b); }
`),
    ).toEqual([]);
  });

  it('ignores the context parameter when the file does not use node:test', () => {
    expect(
      detected(`
import { test } from 'some-other-runner';
test('t', t => { t.assert.equal(a, b); });
`),
    ).toEqual([]);
  });

  it('ignores non-assert members of the context', () => {
    expect(
      detected(`
import test from 'node:test';
test('t', t => { t.diagnostic('note'); t.mock.fn(); });
`),
    ).toEqual([]);
  });

  it('resolves the nearest binding when callbacks nest', () => {
    // The inner `t` shadows the outer one and is not a test context.
    expect(
      detected(`
import test from 'node:test';
test('outer', t => {
  t.assert.ok(1);
  helpers.forEach(t => { t.assert.ok(2); });
});
`),
    ).toEqual(['t.assert.ok(1)']);
  });
});
