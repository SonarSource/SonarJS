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
// https://sonarsource.github.io/rspec/#/rspec/S6959/javascript

import * as estree from 'estree';
import { Rule } from 'eslint';
import {
  getUniqueWriteUsageOrNode,
  isArray as isArrayType,
  isArrayExpression,
  isCallingMethod,
  isRequiredParserServices,
} from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
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
