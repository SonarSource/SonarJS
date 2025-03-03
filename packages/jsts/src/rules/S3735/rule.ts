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
// https://sonarsource.github.io/rspec/#/rspec/S3735/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isRequiredParserServices, isThenable } from '../helpers/index.js';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeVoid: 'Remove this use of the "void" operator.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    function checkNode(node: estree.Node) {
      const unaryExpression: estree.UnaryExpression = node as estree.UnaryExpression;
      if (isVoid0(unaryExpression) || isIIFE(unaryExpression) || isPromiseLike(unaryExpression)) {
        return;
      }
      const operatorToken = context.sourceCode.getTokenBefore(unaryExpression.argument);
      context.report({
        loc: operatorToken!.loc, // cannot be null due to previous checks
        messageId: 'removeVoid',
      });
    }

    function isVoid0(expr: estree.UnaryExpression) {
      return expr.argument.type === 'Literal' && 0 === expr.argument.value;
    }

    function isIIFE(expr: estree.UnaryExpression) {
      return (
        expr.argument.type === 'CallExpression' &&
        ['ArrowFunctionExpression', 'FunctionExpression'].includes(expr.argument.callee.type)
      );
    }

    function isPromiseLike(expr: estree.UnaryExpression) {
      return isRequiredParserServices(services) && isThenable(expr.argument, services);
    }

    return {
      'UnaryExpression[operator="void"]': checkNode,
    };
  },
};
