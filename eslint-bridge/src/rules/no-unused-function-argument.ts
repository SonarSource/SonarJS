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
// https://jira.sonarsource.com/browse/RSPEC-1172

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression': function (node: estree.Node) {
        reportUnusedArgument(
          node,
          (node as estree.FunctionDeclaration | estree.FunctionExpression).id,
          context,
        );
      },
      ArrowFunctionExpression: (node: estree.Node) => {
        reportUnusedArgument(node, undefined, context);
      },
    };
  },
};

function reportUnusedArgument(
  node: estree.Node,
  functionId: estree.Identifier | undefined | null,
  context: Rule.RuleContext,
) {
  const parent = (node as TSESTree.Node).parent;
  if (parent && parent.type === 'Property' && parent.kind === 'set') {
    return;
  }

  if (
    context
      .getScope()
      .variables.some(
        v => v.name === 'arguments' && v.identifiers.length === 0 && v.references.length > 0,
      )
  ) {
    return;
  }

  let parametersVariable = context.getDeclaredVariables(node);

  if (functionId) {
    parametersVariable = parametersVariable.filter(v => v.name !== functionId.name);
  }

  let i = parametersVariable.length - 1;
  while (i >= 0 && isUnusedVariable(parametersVariable[i])) {
    context.report({
      message: `Remove the unused function parameter "${parametersVariable[i].name}".`,
      node: parametersVariable[i].identifiers[0],
    });
    i--;
  }
}

function isUnusedVariable(variable: Scope.Variable) {
  const refs = variable.references;
  //Parameter with default value has one reference, but should still be considered as unused.
  return refs.length === 0 || (refs.length === 1 && refs[0].init);
}
