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
import type estree from 'estree';
import { isIdentifier } from '../helpers/ast.js';

export function getExpectChain(node: estree.Node): { actual: estree.Node; negated: boolean } | null {
  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, 'not')) {
    const chain = getExpectChain(node.object);
    return chain ? { ...chain, negated: !chain.negated } : null;
  }
  if (
    node.type !== 'CallExpression' ||
    !isIdentifier(node.callee, 'expect') ||
    node.arguments.length !== 1
  ) {
    return null;
  }
  return { actual: node.arguments[0], negated: false };
}
