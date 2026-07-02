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
import esprima from 'esprima';
import type estree from 'estree';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { isStringMapCall } from '../../../../../src/jsts/rules/S2871/false-positives/helpers.js';

function parseCallExpression(source: string): estree.CallExpression {
  const program = esprima.parse(source);
  const expression = program.body[0];
  if (
    expression.type !== 'ExpressionStatement' ||
    expression.expression.type !== 'CallExpression'
  ) {
    throw new Error('Expected a call expression');
  }
  return expression.expression;
}

describe('S2871 false-positive helpers', () => {
  it('rejects computed map member access', () => {
    const call = parseCallExpression(`array[map](String);`);

    expect(isStringMapCall(call)).toBe(false);
  });
});
