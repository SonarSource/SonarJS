/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import type { Rule } from 'eslint';
import {
  getSimpleRawStringValue,
  getUniqueWriteUsage,
  isBinaryPlus,
  isIdentifier,
  isRegexLiteral,
  isSimpleRawString,
  isStaticTemplateLiteral,
  isStringLiteral,
} from '../index.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { isRegExpConstructor } from './ast.js';
import { getFlags } from './flags.js';

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

export function getPatternFromNode(
  node: estree.Node,
  context: Rule.RuleContext,
): { pattern: string; flags: string } | null {
  if (isRegExpConstructor(node)) {
    const patternOnly = getPatternFromNode(node.arguments[0], context);
    const flags = getFlags(node, context);
    if (patternOnly && flags !== null) {
      // if we can't extract flags correctly, we skip this
      // to avoid FPs
      return { pattern: patternOnly.pattern, flags };
    }
  } else if (isRegexLiteral(node)) {
    return node.regex;
  } else if (isStringLiteral(node)) {
    return { pattern: node.value as string, flags: '' };
  } else if (isStaticTemplateLiteral(node)) {
    return { pattern: node.quasis[0].value.raw, flags: '' };
  } else if (isSimpleRawString(node)) {
    return { pattern: getSimpleRawStringValue(node), flags: '' };
  } else if (isIdentifier(node)) {
    const assignedExpression = getUniqueWriteUsage(context, node.name, node);
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
