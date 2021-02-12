/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-1154

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isRequiredParserServices } from '../utils/isRequiredParserServices';
import * as ts from 'typescript';
import { getTypeFromTreeNode } from './utils';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    function isString(node: estree.Node) {
      const type = getTypeFromTreeNode(node, services);
      return (type.flags & ts.TypeFlags.StringLike) !== 0;
    }

    function getVariable(node: estree.Node) {
      let variable = context.getSourceCode().getText(node);
      if (variable.length > 30) {
        variable = 'String';
      }
      return variable;
    }

    return {
      'ExpressionStatement > CallExpression[callee.type="MemberExpression"]': (
        node: estree.Node,
      ) => {
        const { object, property } = (node as estree.CallExpression)
          .callee as estree.MemberExpression;
        if (isString(object) && property.type === 'Identifier') {
          context.report({
            message: `${getVariable(
              object,
            )} is an immutable object; you must either store or return the result of the operation.`,
            node: property,
          });
        }
      },
    };
  },
};
