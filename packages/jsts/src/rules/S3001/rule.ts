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
// https://sonarsource.github.io/rspec/#/rspec/S3001/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      removeDelete: 'Remove this "delete" operator or pass an object property to it.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      "UnaryExpression[operator='delete'][argument.type!='MemberExpression'][argument.type!='ChainExpression']":
        (node: estree.Node) => {
          const { argument } = node as estree.UnaryExpression;
          if (!isGlobalProperty(argument, context.sourceCode.getScope(node).references)) {
            context.report({
              messageId: 'removeDelete',
              node,
            });
          }
        },
    };
  },
};

function isGlobalProperty(expr: estree.Expression, references: Scope.Reference[]) {
  return (
    expr.type === 'Identifier' &&
    references.filter(ref => ref.identifier.name === expr.name && ref.resolved).length === 0
  );
}
