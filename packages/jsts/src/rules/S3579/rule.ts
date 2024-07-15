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
// https://sonarsource.github.io/rspec/#/rspec/S3579/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isArray, isString, isRequiredParserServices } from '../helpers';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      noAssociativeArray:
        'Make it an object if it must have named properties; otherwise, use a numeric index here.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'AssignmentExpression[left.type="MemberExpression"]'(node: estree.Node) {
        const { property, object } = (node as estree.AssignmentExpression)
          .left as estree.MemberExpression;
        if (isString(property, services) && isArray(object, services)) {
          context.report({
            messageId: 'noAssociativeArray',
            node,
          });
        }
      },
    };
  },
};
