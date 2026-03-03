/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1523/javascript
// SQ key 'eval'

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getFullyQualifiedName } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const EVAL_LIKE_FUNCTIONS: Set<string> = new Set([
  'eval',
  'Function',
  'vm.Script',
  'vm.SourceTextModule',
  'vm.runInContext',
  'vm.runInNewContext',
  'vm.runInThisContext',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeCode: 'Make sure that this dynamic injection or execution of code is safe.',
      unexpectedScriptURL: "Make sure that 'javascript:' code is safe as it is a form of eval().",
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
      NewExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
      TemplateLiteral: (node: estree.TemplateLiteral) => {
        if (
          node.expressions.length > 0 &&
          /^javascript:/i.exec(node.quasis[0].value.raw)
        ) {
          context.report({ messageId: 'unexpectedScriptURL', node });
        }
      },
      BinaryExpression: (node: estree.BinaryExpression) => {
        const parent = (node as estree.Node & { parent?: estree.Node }).parent;
        if (
          !isConcatenation(parent as estree.Node) &&
          isConcatenation(node) &&
          isVariableConcat(node) &&
          /^javascript:/i.exec(getLeftmostStringValue(node) ?? '')
        ) {
          context.report({ messageId: 'unexpectedScriptURL', node });
        }
      },
    };
  },
};

function checkCallExpression(node: estree.CallExpression, context: Rule.RuleContext) {
  if (['Identifier', 'MemberExpression'].includes(node.callee.type)) {
    const name = getFullyQualifiedName(context, node) || '';
    if (EVAL_LIKE_FUNCTIONS.has(name) && hasAtLeastOneVariableArgument(node.arguments)) {
      context.report({
        messageId: 'safeCode',
        node: node.callee,
      });
    }
  }
}

function hasAtLeastOneVariableArgument(args: Array<estree.Node>) {
  return args.some(arg => !isLiteral(arg));
}

function isLiteral(node: estree.Node) {
  if (node.type === 'Literal') {
    return true;
  }

  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }

  return false;
}

function isConcatenation(node: estree.Node): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && node.operator === '+';
}

function isVariableConcat(node: estree.BinaryExpression): boolean {
  const { left, right } = node;
  if (!isLiteral(right)) {
    return true;
  }
  if (isConcatenation(left)) {
    return isVariableConcat(left);
  }
  return !isLiteral(left);
}

function getLeftmostStringValue(node: estree.BinaryExpression): string | undefined {
  const { left } = node;
  if (isConcatenation(left)) {
    return getLeftmostStringValue(left);
  }
  if (left.type === 'Literal' && typeof left.value === 'string') {
    return left.value;
  }
  if (left.type === 'TemplateLiteral' && left.expressions.length === 0) {
    return left.quasis[0].value.raw;
  }
  return undefined;
}
