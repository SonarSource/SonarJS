/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import {
  generateMeta,
  isFunctionCall,
  isRequiredParserServices,
  isThenable,
} from '../helpers/index.js';
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
    return isThenable(expr.argument, services);
  } else {
    // If we don't have typescript types, we can't reason if it's a promise.
    // Therefore, if this is a function call, assume it is a promise.
    // For this rule, it will result in not raising an issue.
    return isFunctionCall(expr.argument);
  }
}
