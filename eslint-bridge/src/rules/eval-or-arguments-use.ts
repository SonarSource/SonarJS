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
// https://jira.sonarsource.com/browse/RSPEC-1514

import { Rule } from "eslint";
import * as estree from "estree";

type FunctionNodeInterType = estree.FunctionDeclaration &
  estree.FunctionExpression &
  estree.ArrowFunctionExpression;

const illegalName = ["eval", "arguments"];

const getDeclareMessage = (redeclareType: string) => (name: string) =>
  `Do not use "${name}" to declare a ${redeclareType} - use another name.`;

const getModificationMessage = (functionName: string) =>
  `Remove the modification of "${functionName}".`;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      ":function": function(node: estree.Node) {
        const func = node as FunctionNodeInterType;
        reportBadUsage(func.id, getDeclareMessage("function"), context);
        func.params.forEach(p => {
          reportBadUsage(p, getDeclareMessage("parameter"), context);
        });
      },
      VariableDeclaration(node: estree.Node) {
        (node as estree.VariableDeclaration).declarations.forEach(decl => {
          reportBadUsage(decl.id, getDeclareMessage("variable"), context);
        });
      },
      UpdateExpression(node: estree.Node) {
        reportBadUsage((node as estree.UpdateExpression).argument, getModificationMessage, context);
      },
      AssignmentExpression(node: estree.Node) {
        reportBadUsage((node as estree.AssignmentExpression).left, getModificationMessage, context);
      },
      CatchClause(node: estree.Node) {
        reportBadUsage((node as estree.CatchClause).param, getDeclareMessage("variable"), context);
      },
    };
  },
};

function reportBadUsage(
  node: estree.Node | null | undefined,
  buildMessage: (name: string) => string,
  context: Rule.RuleContext,
) {
  if (!node) {
    return;
  } else if (node.type === "RestElement") {
    reportBadUsage(node.argument, buildMessage, context);
  } else if (node.type === "ObjectPattern") {
    node.properties.forEach(prop => {
      reportBadUsage(prop.value, buildMessage, context);
    });
  } else if (node.type === "Identifier" && illegalName.includes(node.name)) {
    context.report({
      message: buildMessage(node.name),
      node: node,
    });
  }
}
