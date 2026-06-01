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

import type { SourceCode } from 'eslint';
import type estree from 'estree';
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import {
  isNullLiteral,
  isUndefinedExpression,
  replacement,
  type Suggestion,
} from './assertion-suggestions.js';

export function getCypressSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  if (
    !isMethodCall(node) ||
    !['should', 'and'].includes(node.callee.property.name) ||
    node.arguments.length !== 2
  ) {
    return null;
  }
  if (!isCyWrapCall(node.callee.object) || node.arguments[0].type !== 'Literal') {
    return null;
  }

  const chainer = node.arguments[0].value;
  const expected = node.arguments[1];
  const property = node.callee.property.name;
  const subject = sourceCode.getText(node.callee.object);
  if (isNullLiteral(expected)) {
    return getCypressNullishSuggestion(node, sourceCode, chainer, subject, property, 'null');
  }
  if (isUndefinedExpression(expected)) {
    return getCypressNullishSuggestion(node, sourceCode, chainer, subject, property, 'undefined');
  }
  return null;
}

function getCypressNullishSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
  chainer: unknown,
  subject: string,
  property: string,
  nullish: 'null' | 'undefined',
): Suggestion | null {
  if (
    chainer !== 'equal' &&
    chainer !== 'not.equal' &&
    chainer !== 'deep.equal' &&
    chainer !== 'not.deep.equal'
  ) {
    return null;
  }

  const negation = chainer === 'not.equal' || chainer === 'not.deep.equal' ? 'not.' : '';
  return replacement(
    `${subject}.${property}('${negation}be.${nullish}')`,
    node,
    sourceCode,
  );
}

function isCyWrapCall(node: estree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    isMethodCall(node) &&
    isIdentifier(node.callee.property, 'wrap') &&
    isIdentifier(node.callee.object, 'cy')
  );
}
