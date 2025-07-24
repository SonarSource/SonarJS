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
// https://sonarsource.github.io/rspec/#/rspec/S2692/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  isArray,
  isRequiredParserServices,
  RequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      considerIncludes:
        "This check ignores index 0; consider using 'includes' method to make this check safe and explicit.",
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      BinaryExpression(node: estree.Node) {
        const expression = node as estree.BinaryExpression;
        if (
          expression.operator === '>' &&
          isZero(expression.right) &&
          isArrayIndexOfCall(expression.left, services)
        ) {
          context.report({ node, messageId: 'considerIncludes' });
        }
      },
    };
  },
};

function isZero(node: estree.Expression): boolean {
  return node.type === 'Literal' && node.value === 0;
}

function isArrayIndexOfCall(
  node: estree.Expression | estree.PrivateIdentifier,
  services: RequiredParserServices,
): boolean {
  return (
    node.type === 'CallExpression' &&
    node.arguments.length === 1 &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'indexOf' &&
    isArray(node.callee.object, services)
  );
}
