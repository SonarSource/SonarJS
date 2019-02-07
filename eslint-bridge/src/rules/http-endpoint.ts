/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

// https://jira.sonarsource.com/browse/RSPEC-4529

import { Rule } from "eslint";
import * as estree from "estree";
import { isMemberWithProperty, isRequireModule } from "./utils";

const message = `Make sure that exposing this HTTP endpoint is safe here.`;

const httpModules = ["http", "https", "express"];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let isHttpModuleImported = false;

    return {
      Program() {
        // init flag for each file
        isHttpModuleImported = false;
      },

      ImportDeclaration(node: estree.Node) {
        const { source } = node as estree.ImportDeclaration;
        if (httpModules.includes(String(source.value))) {
          isHttpModuleImported = true;
        }
      },

      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee } = call;

        if (isRequireModule(call, ...httpModules)) {
          isHttpModuleImported = true;
          return;
        }

        if (isHttpModuleImported && isMemberWithProperty(callee, "listen")) {
          context.report({
            message,
            node: callee,
          });
        }
      },
    };
  },
};
