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
// https://sonarsource.github.io/rspec/#/rspec/S3735/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { unwrapChainExpression } from '../helpers/expect-call-chain.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import {
  getTypeFromTreeNode,
  isAnyOrUnknownType,
  isThenableOrGuardUnion,
  isThenableOrVoidUnion,
} from '../helpers/type.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeVoid: 'Remove this use of the "void" operator.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'UnaryExpression[operator="void"]': (node: estree.Node) => {
        const unaryExpression: estree.UnaryExpression = node as estree.UnaryExpression;
        if (
          isVoid0(unaryExpression) ||
          isIIFE(unaryExpression) ||
          isPromiseLike(context, unaryExpression)
        ) {
          return;
        }
        const operatorToken = context.sourceCode.getTokenBefore(unaryExpression.argument);
        context.report({
          loc: operatorToken!.loc, // cannot be null due to previous checks
          messageId: 'removeVoid',
        });
      },
    };
  },
};

function isVoid0(expr: estree.UnaryExpression) {
  return expr.argument.type === 'Literal' && expr.argument.value === 0;
}

function isIIFE(expr: estree.UnaryExpression) {
  return (
    expr.argument.type === 'CallExpression' &&
    ['ArrowFunctionExpression', 'FunctionExpression'].includes(expr.argument.callee.type)
  );
}

function isPromiseLike(context: Rule.RuleContext, expr: estree.UnaryExpression) {
  const services = context.sourceCode.parserServices;
  if (isRequiredParserServices(services)) {
    return (
      isThenableOrVoidUnion(expr.argument, services) ||
      (isShortCircuitExpression(expr.argument) &&
        isThenableOrGuardUnion(expr.argument, services)) ||
      (isCallLikeExpression(expr.argument) && hasIndeterminateType(expr.argument, services))
    );
  } else {
    // No type info: treat any call-like expression as a possible promise and don't raise.
    return isCallLikeExpression(expr.argument);
  }
}

/**
 * Returns true when `node` is a short-circuit expression whose result depends on a guard.
 * @param node The expression used with `void`.
 * @return Whether the expression is a logical (`||`, `&&`, `??`) or conditional (`?:`) expression.
 */
function isShortCircuitExpression(node: estree.Node) {
  return node.type === 'LogicalExpression' || node.type === 'ConditionalExpression';
}

/**
 * Returns true when `node` is a direct call or an optionally chained call.
 * @param node The expression used with `void`.
 * @return Whether the expression has a callable shape.
 */
function isCallLikeExpression(node: estree.Node) {
  return unwrapChainExpression(node).type === 'CallExpression';
}

/**
 * Returns true when TypeScript cannot determine whether `node` resolves to a promise.
 * @param node The expression used with `void`.
 * @param services The TypeScript parser services.
 * @return Whether the resolved type is `any` or `unknown`.
 */
function hasIndeterminateType(node: estree.Node, services: RequiredParserServices) {
  return isAnyOrUnknownType(getTypeFromTreeNode(node, services));
}
