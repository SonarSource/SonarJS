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
import { createComplexityAccumulator } from './complexity.js';

it('keeps branch tokens inside their own function', () => {
  const program = parse('function outer() { if (a) {} function inner() { if (b) {} } if (c) {} }', {
    loc: true,
  }) as unknown as estree.Program;
  const outer = program.body[0] as estree.FunctionDeclaration;
  const [first, inner, last] = outer.body.body as [
    estree.IfStatement,
    estree.FunctionDeclaration,
    estree.IfStatement,
  ];
  const innerBranch = inner.body.body[0] as estree.IfStatement;
  let tokenLookups = 0;
  const accumulator = createComplexityAccumulator(node => {
    tokenLookups++;
    return { loc: node.loc! };
  });
  accumulator.enterFunction(outer, program);
  accumulator.addBranch(first);
  accumulator.enterFunction(inner, outer);
  accumulator.addBranch(innerBranch);
  accumulator.leaveFunction();
  accumulator.addBranch(last);
  accumulator.leaveFunction();
  accumulator.addBranch(last);

  assert.deepEqual(
    accumulator.getFunctions().map(({ node, tokens }) => [node, tokens.length + 1]),
    [
      [outer, 3],
      [inner, 2],
    ],
  );
  assert.equal(accumulator.hasNestedFunction(outer), true);
  assert.equal(accumulator.hasNestedFunction(inner), false);
  assert.equal(tokenLookups, 3);
});
