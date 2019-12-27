/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import { Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      "FunctionDeclaration, FunctionExpression": function(node: estree.Node) {
        reportUnusedargument(
          node,
          (node as estree.FunctionDeclaration | estree.FunctionExpression).id,
          context,
        );
      },
      ArrowFunctionExpression: (node: estree.Node) => {
        reportUnusedargument(node, undefined, context);
      },
    };
  },
};

function reportUnusedargument(
  node: estree.Node,
  functionId: estree.Identifier | undefined | null,
  context: Rule.RuleContext,
) {
  const parent = (node as TSESTree.Node).parent;
  if (parent && parent.type === "Property" && parent.kind === "set") {
    return;
  }

  if (
    context
      .getScope()
      .variables.some(
        v => v.name === "arguments" && v.identifiers.length === 0 && v.references.length > 0,
      )
  ) {
    return;
  }

  let parametersVariable = context.getDeclaredVariables(node);

  if (functionId) {
    parametersVariable = parametersVariable.filter(v => v.name !== functionId.name);
  }

  let i = parametersVariable.length - 1;
  while (i >= 0 && parametersVariable[i].references.length === 0) {
    context.report({
      message: `Remove the unused function parameter "${parametersVariable[i].name}".`,
      node: parametersVariable[i].identifiers[0],
    });
    i--;
  }
}
