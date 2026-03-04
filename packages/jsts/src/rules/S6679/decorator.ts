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
// https://sonarsource.github.io/rspec/#/rspec/S6679/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import {
  areEquivalent,
  generateMeta,
  getNodeParent,
  getTypeFromTreeNode,
  interceptReport,
  isAny,
  isNumberType,
  isRequiredParserServices,
} from '../helpers/index.js';
import type { RequiredParserServices } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Returns true if the type of the node can be NaN — i.e., it is a number, any, unknown,
 * or type parameter type. Union types are checked member-by-member.
 */
function canBeNaN(node: estree.Node, services: RequiredParserServices): boolean {
  const type = getTypeFromTreeNode(node, services);
  const types = type.isUnion() ? type.types : [type];
  return types.some(
    t =>
      isAny(t) ||
      isNumberType(t) ||
      (t.flags & ts.TypeFlags.Unknown) !== 0 ||
      (t.flags & ts.TypeFlags.TypeParameter) !== 0,
  );
}

/**
 * Returns true if the self-comparison node is part of a dual-NaN equality check pattern
 * such as `a !== a && b !== b`, where both operands of `&&` are self-comparisons of
 * different expressions. This is an intentional idiom used in deep equality implementations
 * to check if both operands are NaN (SameValueZero semantics).
 *
 * When TypeScript type information is available, additionally verifies that both
 * self-compared expressions are of a type that can be NaN (number, any, or unknown).
 */
function isDualNaNCheck(node: estree.BinaryExpression, context: Rule.RuleContext): boolean {
  const parent = getNodeParent(node);
  if (parent?.type !== 'LogicalExpression') {
    return false;
  }
  const logicalExpr = parent as estree.LogicalExpression;
  if (logicalExpr.operator !== '&&') {
    return false;
  }
  const sibling = logicalExpr.left === (node as estree.Node) ? logicalExpr.right : logicalExpr.left;
  if (sibling.type !== 'BinaryExpression') {
    return false;
  }
  const siblingBinary = sibling as estree.BinaryExpression;
  // Check the sibling is also a self-comparison
  if (!areEquivalent(siblingBinary.left, siblingBinary.right, context.sourceCode)) {
    return false;
  }
  // Ensure the sibling checks a different expression than the current node
  const currentText = context.sourceCode.getText(node.left);
  const siblingText = context.sourceCode.getText(siblingBinary.left);
  if (currentText === siblingText) {
    return false;
  }
  // When TypeScript info is available, verify both expressions can be NaN
  const services = context.sourceCode.parserServices;
  if (isRequiredParserServices(services)) {
    return canBeNaN(node.left, services) && canBeNaN(siblingBinary.left, services);
  }
  // No TypeScript info available — suppress to avoid false positives
  return true;
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor && 'messageId' in reportDescriptor) {
        const { node, messageId, ...rest } = reportDescriptor,
          operators = new Set(['===', '==', '!==', '!=']);

        if (
          node.type === 'BinaryExpression' &&
          operators.has(node.operator) &&
          node.left.type !== 'Literal'
        ) {
          // Suppress dual-NaN equality check pattern: `a !== a && b !== b`
          // This is an intentional idiom in deep equality implementations.
          if (isDualNaNCheck(node, context)) {
            return;
          }

          const prefix = node.operator.startsWith('!') ? '' : '!',
            value = context.sourceCode.getText(node.left),
            suggest: Rule.SuggestionReportDescriptor[] = [
              {
                desc: 'Replace self-compare with Number.isNaN()',
                fix: fixer => fixer.replaceText(node, `${prefix}Number.isNaN(${value})`),
              },
            ];

          context.report({
            node,
            message: "Use 'Number.isNaN()' to check for 'NaN' value",
            ...rest,
            suggest,
          });
        }
      }
    },
  );
}
