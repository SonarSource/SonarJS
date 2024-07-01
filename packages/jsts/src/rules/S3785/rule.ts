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
// https://sonarsource.github.io/rspec/#/rspec/S3785/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import * as ts from 'typescript';
import { isRequiredParserServices, getTypeFromTreeNode, toEncodedMessage } from '../helpers';
import { SONAR_RUNTIME } from '../../linter/parameters';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    function isPrimitive(node: estree.Node) {
      const type = getTypeFromTreeNode(node, services);
      return (
        (type.flags & ts.TypeFlags.StringLike) !== 0 ||
        (type.flags & ts.TypeFlags.NumberLike) !== 0 ||
        (type.flags & ts.TypeFlags.BooleanLike) !== 0 ||
        (type.flags & ts.TypeFlags.Null) !== 0 ||
        (type.flags & ts.TypeFlags.Undefined) !== 0
      );
    }
    return {
      'BinaryExpression[operator="in"]': (node: estree.Node) => {
        const { left, right, operator } = node as estree.BinaryExpression;
        if (isPrimitive(right)) {
          const opToken = context.sourceCode
            .getTokensBetween(left, right)
            .find(token => token.type === 'Keyword' && token.value === operator)!;
          context.report({
            message: toEncodedMessage(
              'TypeError can be thrown as this operand might have primitive type.',
              [opToken],
            ),
            node: right,
          });
        }
      },
    };
  },
};
