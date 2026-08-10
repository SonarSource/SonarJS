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
import { isAssertion } from '../../../../src/jsts/rules/helpers/testing/uvu.js';

/**
 * The callees of every call `isAssertion` recognizes in `source`. Member expressions are
 * visited too, so a helper that answered on non-call nodes would show up as a duplicate.
 */
function detectedAssertions(source: string): string[] {
  const detected: string[] = [];
  const collect: Rule.RuleModule = {
    create(context) {
      const check = (node: estree.Node) => {
        if (isAssertion(context, node)) {
          detected.push(context.sourceCode.getText(node));
        }
      };
      return {
        CallExpression: check,
        MemberExpression: check,
      };
    },
  };

  new Linter().verify(source, {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    plugins: { test: { rules: { collect } } },
    rules: { 'test/collect': 'error' },
  });

  return detected;
}

describe('uvu.isAssertion', () => {
  it('recognizes the documented uvu/assert API', () => {
    expect(
      detectedAssertions(`
        import assert from 'uvu/assert';
        assert.ok(value);
        assert.is(actual, expected);
        assert.equal(actual, expected);
        assert.type(actual, 'string');
        assert.instance(actual, Constructor);
        assert.match(actual, /pattern/);
        assert.snapshot(actual, expected);
        assert.fixture(actual, expected);
        assert.throws(fn);
        assert.unreachable('unexpected');
        assert.is.not(actual, expected);
        assert.not(value);
        assert.not.ok(value);
        assert.not.equal(actual, expected);
        assert.not.type(actual, 'string');
        assert.not.instance(actual, Constructor);
        assert.not.match(actual, /pattern/);
        assert.not.snapshot(actual, expected);
        assert.not.fixture(actual, expected);
        assert.not.throws(fn);
      `),
    ).toEqual([
      'assert.ok(value)',
      'assert.is(actual, expected)',
      'assert.equal(actual, expected)',
      "assert.type(actual, 'string')",
      'assert.instance(actual, Constructor)',
      'assert.match(actual, /pattern/)',
      'assert.snapshot(actual, expected)',
      'assert.fixture(actual, expected)',
      'assert.throws(fn)',
      "assert.unreachable('unexpected')",
      'assert.is.not(actual, expected)',
      'assert.not(value)',
      'assert.not.ok(value)',
      'assert.not.equal(actual, expected)',
      "assert.not.type(actual, 'string')",
      'assert.not.instance(actual, Constructor)',
      'assert.not.match(actual, /pattern/)',
      'assert.not.snapshot(actual, expected)',
      'assert.not.fixture(actual, expected)',
      'assert.not.throws(fn)',
    ]);
  });

  it('recognizes namespace and CommonJS imports of uvu/assert', () => {
    expect(
      detectedAssertions(`
        import * as assert from 'uvu/assert';
        assert.is(actual, expected);
      `),
    ).toEqual(['assert.is(actual, expected)']);
    expect(
      detectedAssertions(`
        const assert = require('uvu/assert');
        assert.is(actual, expected);
      `),
    ).toEqual(['assert.is(actual, expected)']);
    expect(
      detectedAssertions(`
        const { is } = require('uvu/assert');
        is(actual, expected);
      `),
    ).toEqual(['is(actual, expected)']);
  });

  it('rejects members outside the documented API', () => {
    expect(
      detectedAssertions(`
        import assert from 'uvu/assert';
        assert('ready');
        assert.custom('ready');
        assert.equal.custom(actual, expected);
        assert.is.deep(actual, expected);
        assert.is.not.deep(actual, expected);
        assert.not.is(actual, expected);
        assert.not.not(value);
        assert.not.unreachable('unexpected');
        assert.not.custom(value);
        assert.Assertion({});
      `),
    ).toEqual([]);
  });

  it('rejects assert objects that do not come from uvu/assert', () => {
    expect(
      detectedAssertions(`
        import assert from 'node:assert/strict';
        assert.is(actual, expected);
      `),
    ).toEqual([]);
    expect(
      detectedAssertions(`
        const assert = { is: () => {} };
        assert.is(actual, expected);
      `),
    ).toEqual([]);
  });
});
