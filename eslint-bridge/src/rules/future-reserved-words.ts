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
// https://jira.sonarsource.com/browse/RSPEC-1523

import { Rule, Scope } from "eslint";
import * as estree from "estree";
import { getVariableFromName } from "./utils";

const futureReservedWords = [
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "enum",
  "class",
  "const",
  "export",
  "extends",
  "import",
  "super",
  "let",
  "static",
  "yield",
  "await",
];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let reported: Scope.Variable[] = [];
    return {
      Program: (_node: estree.Node) => {
        reported = [];
      },
      Identifier: (node: estree.Node) => {
        const name = (node as estree.Identifier).name;
        if (!futureReservedWords.includes(name)) {
          return;
        }
        const variable = getVariableFromName(context, name);
        if (variable && !reported.includes(variable) && variable.defs.length > 0) {
          const def = variable.defs[0].name;
          context.report({
            node: def,
            message: `Rename "${name}" identifier to prevent potential conflicts with future evolutions of the JavaScript language.`,
          });
          reported.push(variable);
        }
      },
    };
  },
};
