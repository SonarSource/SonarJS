/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import * as estree from 'estree';
import * as regexpp from 'regexpp';
import { CapturingGroup, Group, LookaroundAssertion, Pattern } from 'regexpp/ast';

/**
 * An alternation is a regexpp node that has an `alternatives` field.
 */
export type Alternation = Pattern | CapturingGroup | Group | LookaroundAssertion;

export function extractRegex(node: estree.Node) {
  let pattern: string | null;
  let flags: string | null;
  if (isRegexLiteral(node)) {
    ({ pattern, flags } = (node as estree.RegExpLiteral).regex);
  } else if (isRegExpConstructor(node)) {
    pattern = getPattern(node);
    flags = getFlags(node);
  } else {
    pattern = flags = null;
  }
  if (pattern === null || flags === null) {
    return null;
  }
  try {
    return regexpp.parseRegExpLiteral(new RegExp(pattern, flags));
  } catch {
    return null;
  }
}

export function isRegexLiteral(node: estree.Node): node is estree.Literal {
  return node.type === 'Literal' && node.value instanceof RegExp;
}

export function isRegExpConstructor(node: estree.Node): node is estree.CallExpression {
  return (
    (node.type === 'CallExpression' || node.type === 'NewExpression') &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'RegExp'
  );
}

export function getPattern(callExpr: estree.CallExpression): string | null {
  if (callExpr.arguments.length > 0) {
    const pattern = callExpr.arguments[0];
    if (pattern.type === 'Literal' && typeof pattern.value === 'string') {
      return pattern.value;
    }
  }
  return null;
}

export function getFlags(callExpr: estree.CallExpression): string | null {
  if (callExpr.arguments.length < 2) {
    return '';
  }
  const flags = callExpr.arguments[1];
  if (flags.type === 'Literal' && typeof flags.value === 'string') {
    return flags.value;
  }
  return null;
}
