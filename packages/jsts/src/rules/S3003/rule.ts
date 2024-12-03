/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3003/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  isRequiredParserServices,
  isString,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      BinaryExpression: (node: estree.Node) => {
        const { operator, left, right } = node as estree.BinaryExpression;
        if (
          ['<', '<=', '>', '>='].includes(operator) &&
          isString(left, services) &&
          isString(right, services) &&
          !isLiteralException(left) &&
          !isLiteralException(right) &&
          !isWithinSortCallback(context, node)
        ) {
          report(
            context,
            {
              message: `Convert operands of this use of "${operator}" to number type.`,
              loc: context.sourceCode
                .getTokensBetween(left, right)
                .find(token => token.type === 'Punctuator' && token.value === operator)!.loc,
            },
            [left, right].map(node => toSecondaryLocation(node)),
          );
        }
      },
    };
  },
};

function isLiteralException(node: estree.Node) {
  return node.type === 'Literal' && node.raw!.length === 3;
}

function isWithinSortCallback(context: Rule.RuleContext, node: estree.Node) {
  const ancestors = context.sourceCode.getAncestors(node).reverse();
  const maybeCallback = ancestors.find(node =>
    ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type),
  );
  if (maybeCallback) {
    const callback = maybeCallback as TSESTree.Node;
    const parent = callback.parent;
    if (parent?.type === 'CallExpression') {
      const { callee, arguments: args } = parent;
      let funcName: string | undefined;
      if (callee.type === 'Identifier') {
        funcName = callee.name;
      } else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        funcName = callee.property.name;
      }
      return funcName?.match(/sort/i) && args.some(arg => arg === callback);
    }
  }
  return false;
}
