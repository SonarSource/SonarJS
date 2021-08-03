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
import { AST, Rule } from 'eslint';
import { getUniqueWriteUsage, isRegexLiteral, isStringLiteral } from './utils-ast';
import { ParserServices, TSESTree } from '@typescript-eslint/experimental-utils';
import { tokenizeString } from './utils-string-literal';
import { isString } from './utils-type';

/**
 * An alternation is a regexpp node that has an `alternatives` field.
 */
export type Alternation = Pattern | CapturingGroup | Group | LookaroundAssertion;

export function getParsedRegex(
  node: estree.Node,
  context: Rule.RuleContext,
): regexpp.AST.RegExpLiteral | null {
  const patternAndFlags = getPatternFromNode(node, context);
  if (patternAndFlags) {
    try {
      return regexpp.parseRegExpLiteral(new RegExp(patternAndFlags.pattern, patternAndFlags.flags));
    } catch {
      // do nothing for invalid regex
    }
  }

  return null;
}

function getPatternFromNode(
  node: estree.Node,
  context: Rule.RuleContext,
): { pattern: string; flags: string } | null {
  if (isRegExpConstructor(node) && node.arguments.length > 0) {
    const patternOnly = getPatternFromNode(node.arguments[0], context);
    const flags = getFlags(node);
    if (patternOnly && flags !== null) {
      return { pattern: patternOnly.pattern, flags };
    }
  } else if (isRegexLiteral(node)) {
    return node.regex;
  } else if (isStringLiteral(node)) {
    return { pattern: node.value as string, flags: '' };
  } else if (
    node.type === 'TemplateLiteral' &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    return { pattern: node.quasis[0].value.raw, flags: '' };
  } else if (node.type === 'Identifier') {
    const assignedExpression = getUniqueWriteUsage(context, node.name);
    if (
      assignedExpression &&
      (assignedExpression as TSESTree.Node).parent?.type === 'VariableDeclarator'
    ) {
      return getPatternFromNode(assignedExpression, context);
    }
  } else if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = getPatternFromNode(node.left, context);
    const right = getPatternFromNode(node.right, context);
    if (left && right) {
      return { pattern: left.pattern + right.pattern, flags: '' };
    }
  }

  return null;
}

export function isRegExpConstructor(node: estree.Node): node is estree.CallExpression {
  return (
    (node.type === 'CallExpression' || node.type === 'NewExpression') &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'RegExp'
  );
}

function getFlags(callExpr: estree.CallExpression): string | null {
  if (callExpr.arguments.length < 2) {
    return '';
  }
  const flags = callExpr.arguments[1];
  if (flags.type === 'Literal' && typeof flags.value === 'string') {
    return flags.value;
  }
  return null;
}

export function getRegexpLocation(
  node: estree.Node,
  regexpNode: regexpp.AST.Node,
  context: Rule.RuleContext,
  offset = [0, 0],
): AST.SourceLocation {
  let loc: AST.SourceLocation;
  if (isRegexLiteral(node) || isStringLiteral(node)) {
    const source = context.getSourceCode();
    const [start] = node.range!;
    const [reStart, reEnd] = getRegexpRange(node, regexpNode);
    loc = {
      start: source.getLocFromIndex(start + reStart + offset[0]),
      end: source.getLocFromIndex(start + reEnd + offset[1]),
    };
  } else {
    loc = node.loc!;
  }
  return loc;
}

function getRegexpRange(node: estree.Node, regexpNode: regexpp.AST.Node): AST.Range {
  if (isRegexLiteral(node)) {
    return [regexpNode.start, regexpNode.end];
  }
  if (isStringLiteral(node)) {
    if (node.value === '') {
      return [0, 2];
    }
    const s = node.raw!;
    const tokens = tokenizeString(unquote(s));
    const start = tokens[regexpNode.start - 1].range[0];
    const end = tokens[regexpNode.end - 2].range[1];
    return [start, end];
  }
  throw new Error(`Expected regexp or string literal, got ${node.type}`);
}

function unquote(s: string): string {
  if (s.charAt(0) !== "'" && s.charAt(0) !== '"') {
    throw new Error(`invalid string to unquote: ${s}`);
  }
  return s.substring(1, s.length - 1);
}

export function isStringRegexMethodCall(call: estree.CallExpression, services: ParserServices) {
  return (
    call.callee.type === 'MemberExpression' &&
    call.callee.property.type === 'Identifier' &&
    !call.callee.computed &&
    ['match', 'matchAll', 'search'].includes(call.callee.property.name) &&
    call.arguments.length > 0 &&
    isString(call.callee.object, services) &&
    isString(call.arguments[0], services)
  );
}
