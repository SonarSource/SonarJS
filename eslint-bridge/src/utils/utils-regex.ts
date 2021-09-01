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
import {
  getUniqueWriteUsage,
  isBinaryPlus,
  isIdentifier,
  isRegexLiteral,
  isStaticTemplateLiteral,
  isStringLiteral,
} from './utils-ast';
import { ParserServices, TSESTree } from '@typescript-eslint/experimental-utils';
import { tokenizeString } from './utils-string-literal';
import { isString } from './utils-type';
import { last } from './utils-collection';

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
  if (isRegExpConstructor(node)) {
    const patternOnly = getPatternFromNode(node.arguments[0], context);
    const flags = getFlags(node);
    if (patternOnly && flags !== null) {
      return { pattern: patternOnly.pattern, flags };
    }
  } else if (isRegexLiteral(node)) {
    return node.regex;
  } else if (isStringLiteral(node)) {
    return { pattern: node.value as string, flags: '' };
  } else if (isStaticTemplateLiteral(node)) {
    return { pattern: node.quasis[0].value.raw, flags: '' };
  } else if (isIdentifier(node)) {
    const assignedExpression = getUniqueWriteUsage(context, node.name);
    if (
      assignedExpression &&
      (assignedExpression as TSESTree.Node).parent?.type === 'VariableDeclarator'
    ) {
      return getPatternFromNode(assignedExpression, context);
    }
  } else if (isBinaryPlus(node)) {
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
    node.callee.name === 'RegExp' &&
    node.arguments.length > 0
  );
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
    if (regexpNode.start === regexpNode.end) {
      // this happens in case of empty alternative node like '|'
      if (regexpNode.start - 1 < tokens.length) {
        // '|' first empty alternative will have start = 1, end = 1
        // +1 is to account for string quote
        return [
          tokens[regexpNode.start - 1].range[0] + 1,
          tokens[regexpNode.start - 1].range[0] + 1,
        ];
      } else {
        // '|' second empty alternative regex node will have start = 2, end = 2
        // +1 is to account for string quote
        return [last(tokens).range[1] + 1, last(tokens).range[1] + 1];
      }
    }
    // regexpNode positions are 1 - based, we need to -1 to report as 0 - based
    // it's possible for node start to be outside of range, e.g. `a` in new RegExp('//a')
    const startToken = Math.min(regexpNode.start - 1, tokens.length - 1);
    const start = tokens[startToken].range[0];
    // it's possible for node end to be outside of range, e.g. new RegExp('\n(|)')
    const endToken = Math.min(regexpNode.end - 2, tokens.length - 1);
    const end = tokens[endToken].range[1];
    // +1 is needed to account for string quotes
    return [start + 1, end + 1];
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
