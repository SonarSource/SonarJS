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
import { ModuleInitializerTracker } from './module-initializers.js';

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
    const tracker = new ModuleInitializerTracker(() => false);
    tracker.recordCall(call);
    assert.equal(tracker.getExcludedFactories(() => false).has(factory), excluded, code);
  }
});

it('requires nested functions for named loader paths', () => {
  const call = callFrom(statements('sap.ui.define([], function () {})')[0]);
  const factory = call.arguments[1] as estree.Node;
  const tracker = new ModuleInitializerTracker(() => false);
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
  const tracker = new ModuleInitializerTracker(() => false);
  tracker.recordCall(call);
  tracker.recordWrite(write.left);
  assert.equal(tracker.getExcludedFactories(() => true).has(factory), false);

  const boundTracker = new ModuleInitializerTracker((_node, name) => name === 'sap');
  boundTracker.recordCall(call);
  assert.equal(boundTracker.getExcludedFactories(() => true).has(factory), false);
});

it('checks writes only while an eligible loader path remains', () => {
  const [callStatement, firstWrite, secondWrite] = statements(
    'sap.ui.define([], function () {}); sap.ui = other; sap.ui.define = other',
  );
  let bindingChecks = 0;
  const tracker = new ModuleInitializerTracker(() => {
    bindingChecks++;
    return false;
  });
  tracker.recordCall(callFrom(callStatement));
  bindingChecks = 0;
  for (const statement of [firstWrite, secondWrite]) {
    const write = (statement as estree.ExpressionStatement)
      .expression as estree.AssignmentExpression;
    tracker.recordWrite(write.left);
  }

  assert.equal(tracker.getExcludedFactories(() => false).size, 0);
  assert.equal(bindingChecks, 0);
  assert.equal(tracker.getExcludedFactories(() => true).size, 0);
  assert.equal(bindingChecks, 1);
});

it('keeps an unrelated loader path after a write', () => {
  const [sapStatement, systemStatement, writeStatement] = statements(
    'sap.ui.define([], function () {}); System.register([], function () {}); sap.ui = other',
  );
  const sapCall = callFrom(sapStatement);
  const systemCall = callFrom(systemStatement);
  const write = (writeStatement as estree.ExpressionStatement)
    .expression as estree.AssignmentExpression;
  const tracker = new ModuleInitializerTracker(() => false);
  tracker.recordCall(sapCall);
  tracker.recordCall(systemCall);
  tracker.recordWrite(write.left);

  const excluded = tracker.getExcludedFactories(() => true);
  assert.equal(excluded.has(sapCall.arguments[1] as estree.Node), false);
  assert.equal(excluded.has(systemCall.arguments[1] as estree.Node), true);
});
