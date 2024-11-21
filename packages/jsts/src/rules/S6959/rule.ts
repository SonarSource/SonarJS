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
// https://sonarsource.github.io/rspec/#/rspec/S6959/javascript

import estree from 'estree';
import type { Rule } from 'eslint';
import {
  generateMeta,
  getUniqueWriteUsageOrNode,
  isArray as isArrayType,
  isArrayExpression,
  isCallingMethod,
  isRequiredParserServices,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      message: 'Add an initial value to this "reduce()" call.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    function isArray(node: estree.Node) {
      if (isRequiredParserServices(services)) {
        return isArrayType(node, services);
      } else {
        return isArrayExpression(getUniqueWriteUsageOrNode(context, node));
      }
    }

    return {
      CallExpression(node) {
        if (isCallingMethod(node, 1, 'reduce') && isArray(node.callee.object)) {
          context.report({
            node: node.callee.property,
            messageId: 'message',
          });
        }
      },
    };
  },
};
