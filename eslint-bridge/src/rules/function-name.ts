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
// https://jira.sonarsource.com/browse/RSPEC-100

import { Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      Property: (node: estree.Node) => {
        const prop = node as TSESTree.Property;
        if (isFunctionExpression(prop.value)) {
          checkName(prop.key);
        }
      },
      VariableDeclarator: (node: estree.Node) => {
        const variable = node as TSESTree.VariableDeclarator;
        if (isFunctionExpression(variable.init)) {
          checkName(variable.id);
        }
      },
      FunctionDeclaration: (node: estree.Node) =>
        checkName((node as TSESTree.FunctionDeclaration).id),
      MethodDefinition: (node: estree.Node) => {
        const key = (node as TSESTree.MethodDefinition).key;
        checkName(key);
      },
    };

    function checkName(id: TSESTree.Node | null) {
      const [{ format }] = context.options;
      if (id && id.type === "Identifier" && !id.name.match(format)) {
        context.report({
          message: `Rename this '${id.name}' function to match the regular expression '${format}'.`,
          node: id,
        });
      }
    }
  },
};

function isFunctionExpression(node: TSESTree.Node | null) {
  return node && (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression");
}
