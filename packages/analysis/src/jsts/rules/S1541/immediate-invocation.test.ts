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
import { strict as assert } from 'node:assert';
import { it } from 'node:test';
import { parse } from '@typescript-eslint/parser';
import type estree from 'estree';
import {
  getImmediatelyConstructedFunction,
  getImmediatelyInvokedFunction,
} from './immediate-invocation.js';

function expression(code: string): estree.Expression {
  const program = parse(code) as unknown as estree.Program;
  return (program.body[0] as estree.ExpressionStatement).expression;
}

it('identifies a function literal used as a call target', () => {
  for (const code of ['(function () {})()', '(0, () => {})()']) {
    const call = expression(code) as estree.CallExpression;
    assert.ok(getImmediatelyInvokedFunction(call.callee), code);
  }
  for (const code of ['(function* () {})()', '(function () {}).call()']) {
    const call = expression(code) as estree.CallExpression;
    assert.equal(getImmediatelyInvokedFunction(call.callee), undefined, code);
  }
});

it('identifies only synchronous constructor function literals', () => {
  for (const [code, expected] of [
    ['new (function () {})()', true],
    ['new (async function () {})()', false],
    ['new (() => {})()', false],
  ] as const) {
    const constructor = expression(code) as estree.NewExpression;
    assert.equal(Boolean(getImmediatelyConstructedFunction(constructor.callee)), expected, code);
  }
});
