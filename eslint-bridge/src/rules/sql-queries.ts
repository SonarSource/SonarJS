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
// https://jira.sonarsource.com/browse/RSPEC-2077

import { Rule } from "eslint";
import * as estree from "estree";
import { isMemberWithProperty, isRequireModule } from "./utils";

const message = `Make sure that executing SQL queries is safe here.`;

const dbModules = ["pg", "mysql", "mysql2"];

type Argument = estree.Expression | estree.SpreadElement;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let isDbModuleImported = false;

    return {
      Program() {
        // init flag for each file
        isDbModuleImported = false;
      },

      ImportDeclaration(node: estree.Node) {
        const { source } = node as estree.ImportDeclaration;
        if (dbModules.includes(String(source.value))) {
          isDbModuleImported = true;
        }
      },

      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee, arguments: args } = call;

        if (isRequireModule(call, ...dbModules)) {
          isDbModuleImported = true;
          return;
        }

        if (isDbModuleImported && isMemberWithProperty(callee, "query") && isQuestionable(args)) {
          context.report({
            message,
            node: callee,
          });
        }
      },
    };
  },
};

function isQuestionable([sqlQuery, ...otherArguments]: Argument[]) {
  if (!sqlQuery) {
    return false;
  }
  return otherArguments.length < 2 && sqlQuery.type !== "Literal";
}
