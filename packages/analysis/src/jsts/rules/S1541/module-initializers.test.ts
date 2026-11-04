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
import { createModuleInitializerTracker } from './module-initializers.js';

function statements(code: string): estree.Statement[] {
  return (parse(code) as unknown as estree.Program).body as estree.Statement[];
}

function callFrom(statement: estree.Statement): estree.CallExpression {
  const expression = (statement as estree.ExpressionStatement).expression;
  return (
    expression.type === 'ChainExpression' ? expression.expression : expression
  ) as estree.CallExpression;
}

it('accepts direct AMD factories and rejects optional calls', () => {
  for (const [code, excluded] of [
    ['define([], function () {})', true],
    ['define?.([], function () {})', false],
  ] as const) {
    const call = callFrom(statements(code)[0]);
    const factory = call.arguments.at(-1) as estree.Node;
    const tracker = createModuleInitializerTracker(() => false);
    tracker.recordCall(call);
    assert.equal(tracker.getExcludedFactories(() => false).has(factory), excluded, code);
  }
});

it('requires nested functions for named loader paths', () => {
  const call = callFrom(statements('sap.ui.define([], function () {})')[0]);
  const factory = call.arguments[1] as estree.Node;
  const tracker = createModuleInitializerTracker(() => false);
  tracker.recordCall(call);
  assert.equal(tracker.getExcludedFactories(() => false).has(factory), false);
  assert.equal(tracker.getExcludedFactories(() => true).has(factory), true);
});

it('uses a file-wide write guard and a supplied runtime binding check', () => {
  const [callStatement, writeStatement] = statements(
    'sap.ui.define([], function () {}); sap.ui = other',
  );
  const call = callFrom(callStatement);
  const factory = call.arguments[1] as estree.Node;
  const write = (writeStatement as estree.ExpressionStatement)
    .expression as estree.AssignmentExpression;
  const tracker = createModuleInitializerTracker(() => false);
  tracker.recordCall(call);
  tracker.recordWrite(write.left);
  assert.equal(tracker.getExcludedFactories(() => true).has(factory), false);

  const boundTracker = createModuleInitializerTracker((_node, name) => name === 'sap');
  boundTracker.recordCall(call);
  assert.equal(boundTracker.getExcludedFactories(() => true).has(factory), false);
});
