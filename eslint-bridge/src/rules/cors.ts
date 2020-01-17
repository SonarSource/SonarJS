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
// https://jira.sonarsource.com/browse/RSPEC-5122

import { Rule } from "eslint";
import * as estree from "estree";
import { getModuleNameOfIdentifier, isRequireModule } from "./utils";

const MESSAGE = `Make sure that enabling CORS is safe here.`;

const CORS_HEADER_PREFIX = "Access-Control-";

const EXPRESS_MODULE = "express";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let usingExpressFramework = false;

    return {
      Program() {
        // init flag for each file
        usingExpressFramework = false;
      },

      ImportDeclaration(node: estree.Node) {
        const { source } = node as estree.ImportDeclaration;
        if (source.value === EXPRESS_MODULE) {
          usingExpressFramework = true;
        }
      },

      Literal(node: estree.Node) {
        const { value } = node as estree.Literal;
        if (String(value).includes(CORS_HEADER_PREFIX)) {
          context.report({ message: MESSAGE, node });
        }
      },

      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee } = call;

        if (isRequireModule(call, EXPRESS_MODULE)) {
          usingExpressFramework = true;
          return;
        }

        if (usingExpressFramework && callee.type === "Identifier") {
          const moduleName = getModuleNameOfIdentifier(callee, context);
          if (moduleName && moduleName.value === "cors") {
            context.report({
              message: MESSAGE,
              node,
            });
          }
        }
      },
    };
  },
};
