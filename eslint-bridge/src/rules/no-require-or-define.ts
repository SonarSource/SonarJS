/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-3533
import { Rule } from 'eslint';
import * as estree from 'estree';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      'CallExpression[callee.type="Identifier"]': (node: estree.Node) => {
        if (context.getScope().type !== 'module' && context.getScope().type !== 'global') {
          return;
        }
        const callExpression = node as estree.CallExpression;
        const identifier = callExpression.callee as estree.Identifier;
        if (
          isAmdImport(callExpression, identifier) ||
          isCommonJsImport(callExpression, identifier)
        ) {
          context.report({
            node: identifier,
            message: `Use a standard "import" statement instead of "${identifier.name}".`,
          });
        }
      },
    };
  },
};

function isCommonJsImport(
  callExpression: estree.CallExpression,
  identifier: estree.Identifier,
): boolean {
  return callExpression.arguments.length === 1 && identifier.name === 'require';
}

function isAmdImport(
  callExpression: estree.CallExpression,
  identifier: estree.Identifier,
): boolean {
  if (identifier.name !== 'require' && identifier.name !== 'define') {
    return false;
  }
  if (callExpression.arguments.length !== 2 && callExpression.arguments.length !== 3) {
    return false;
  }
  return (
    callExpression.arguments[callExpression.arguments.length - 1].type === 'FunctionExpression'
  );
}
