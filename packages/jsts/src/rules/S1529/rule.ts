/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1529/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import { generateMeta, getTypeFromTreeNode } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const BITWISE_AND_OR = ['&', '|'];
const BITWISE_OPERATORS = [
  '&',
  '|',
  '^',
  '~',
  '<<',
  '>>',
  '>>>',
  '&=',
  '|=',
  '^=',
  '<<=',
  '>>=',
  '>>>=',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const isNumeric = getNumericTypeChecker(context);
    let lonelyBitwiseAndOr: null | estree.BinaryExpression = null;
    let lonelyBitwiseAndOrAncestors: estree.Node[] = [];
    let fileContainsSeveralBitwiseOperations = false;
    return {
      BinaryExpression(node: estree.Node) {
        const expression = node as estree.BinaryExpression;
        if (
          !lonelyBitwiseAndOr &&
          BITWISE_AND_OR.includes(expression.operator) &&
          !isNumeric(expression.left) &&
          !isNumeric(expression.right)
        ) {
          lonelyBitwiseAndOr = expression;
          lonelyBitwiseAndOrAncestors = [...context.sourceCode.getAncestors(node)];
        } else if (BITWISE_OPERATORS.includes(expression.operator)) {
          fileContainsSeveralBitwiseOperations = true;
        }
      },
      'Program:exit'() {
        if (
          !fileContainsSeveralBitwiseOperations &&
          lonelyBitwiseAndOr &&
          insideCondition(lonelyBitwiseAndOr, lonelyBitwiseAndOrAncestors)
        ) {
          const op = lonelyBitwiseAndOr.operator;
          const operatorToken = context.sourceCode.getTokenAfter(lonelyBitwiseAndOr.left);
          if (operatorToken) {
            context.report({
              loc: operatorToken.loc,
              message: `Review this use of bitwise "${op}" operator; conditional "${op}${op}" might have been intended.`,
            });
          }
        }
      },
    };
  },
};

function insideCondition(node: estree.Node, ancestors: estree.Node[]) {
  let child = node;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const parent = ancestors[i];
    if (
      parent.type === 'IfStatement' ||
      parent.type === 'ForStatement' ||
      parent.type === 'WhileStatement' ||
      parent.type === 'DoWhileStatement' ||
      parent.type === 'ConditionalExpression'
    ) {
      return parent.test === child;
    }
    child = parent;
  }
  return false;
}

type NumericTypeChecker = (node: estree.Node) => boolean;

function getNumericTypeChecker(context: Rule.RuleContext): NumericTypeChecker {
  const services = context.sourceCode.parserServices;
  if (!!services && !!services.program && !!services.esTreeNodeToTSNodeMap) {
    return (node: estree.Node) => isNumericType(getTypeFromTreeNode(node, services));
  } else {
    const numericTypes = ['number', 'bigint'];
    return (node: estree.Node) =>
      node.type === 'Literal' ? numericTypes.includes(typeof node.value) : false;
  }

  function isNumericType(type: ts.Type): boolean {
    return (
      (type.getFlags() & (ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike)) !== 0 ||
      (type.isUnionOrIntersection() && !!type.types.find(isNumericType))
    );
  }
}
