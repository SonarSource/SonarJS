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
// https://jira.sonarsource.com/browse/RSPEC-1219

import { Rule } from "eslint";
import * as estree from "estree";

const ScopeLike = ["FunctionExpression", "FunctionDeclaration", "SwitchCase", "LabeledStatement"];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const stack: number[] = [0];
    function enterCase() {
      stack.push(stack.pop()! + 1);
    }
    function leaveCase() {
      stack.push(stack.pop()! - 1);
    }
    function inCase() {
      return stack[stack.length - 1] > 0;
    }
    return {
      "*": (node: estree.Node) => {
        if (!isScopeLike(node)) {
          return;
        }
        if (node.type === "SwitchCase") {
          enterCase();
        } else if (node.type === "LabeledStatement") {
          if (inCase()) {
            const label = node.label;
            context.report({
              message: `Remove this misleading "${label.name}" label.`,
              node: label,
            });
          }
        } else {
          stack.push(0);
        }
      },
      "*:exit": (node: estree.Node) => {
        if (!isScopeLike(node)) {
          return;
        }
        if (node.type === "SwitchCase") {
          leaveCase();
        } else if (node.type !== "LabeledStatement") {
          stack.pop();
        }
      },
    };
  },
};

function isScopeLike(node: estree.Node) {
  return ScopeLike.includes(node.type);
}
