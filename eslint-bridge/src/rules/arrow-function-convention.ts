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
// https://jira.sonarsource.com/browse/RSPEC-3524

import { Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";

const MESSAGE_ADD_PARAMETER = "Add parentheses around the parameter of this arrow function.";
const MESSAGE_REMOVE_PARAMETER = "Remove parentheses around the parameter of this arrow function.";
const MESSAGE_ADD_BODY = 'Add curly braces and "return" to this arrow function body.';
const MESSAGE_REMOVE_BODY = 'Remove curly braces and "return" from this arrow function body.';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        type: "object",
        properties: {
          requireParameterParentheses: {
            type: "boolean",
          },
          requireBodyBraces: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const options = context.options[0] || {};
    const requireParameterParentheses = !!options.requireParameterParentheses;
    const requireBodyBraces = !!options.requireBodyBraces;
    return {
      ArrowFunctionExpression(node: estree.Node) {
        const arrowFunction = node as estree.ArrowFunctionExpression;
        checkParameters(context, requireParameterParentheses, arrowFunction);
        checkBody(context, requireBodyBraces, arrowFunction);
      },
    };
  },
};

function checkParameters(
  context: Rule.RuleContext,
  requireParameterParentheses: boolean,
  arrowFunction: estree.ArrowFunctionExpression,
) {
  const parameters = arrowFunction.params;
  if (parameters.length !== 1) {
    return;
  }
  const firstParameter = arrowFunction.params[0];
  const firstToken = context.getSourceCode().getFirstToken(arrowFunction);
  const hasParameterParentheses = firstToken && firstToken.value === "(";

  if (requireParameterParentheses && !hasParameterParentheses) {
    context.report({ node: firstParameter, message: MESSAGE_ADD_PARAMETER });
  } else if (!requireParameterParentheses && hasParameterParentheses) {
    const arrowFunctionComments = context.getSourceCode().getCommentsInside(arrowFunction);
    const arrowFunctionBodyComments = context.getSourceCode().getCommentsInside(arrowFunction.body);
    // parameters comments inside parentheses are not available, so use the following subtraction:
    const hasArrowFunctionParamsComments =
      arrowFunctionComments.filter(comment => !arrowFunctionBodyComments.includes(comment)).length >
      0;
    if (
      firstParameter.type === "Identifier" &&
      !hasArrowFunctionParamsComments &&
      !(firstParameter as TSESTree.Identifier).typeAnnotation &&
      !(arrowFunction as TSESTree.ArrowFunctionExpression).returnType
    ) {
      context.report({ node: firstParameter, message: MESSAGE_REMOVE_PARAMETER });
    }
  }
}

function checkBody(
  context: Rule.RuleContext,
  requireBodyBraces: boolean,
  arrowFunction: estree.ArrowFunctionExpression,
) {
  const hasBodyBraces = arrowFunction.body.type === "BlockStatement";
  if (requireBodyBraces && !hasBodyBraces) {
    context.report({ node: arrowFunction.body, message: MESSAGE_ADD_BODY });
  } else if (!requireBodyBraces && hasBodyBraces) {
    const statements = (arrowFunction.body as estree.BlockStatement).body;
    if (statements.length === 1) {
      const statement = statements[0];
      if (isRemovableReturn(statement)) {
        context.report({ node: arrowFunction.body, message: MESSAGE_REMOVE_BODY });
      }
    }
  }
}

function isRemovableReturn(statement: estree.Statement) {
  if (statement.type === "ReturnStatement") {
    const returnStatement = statement;
    const returnExpression = returnStatement.argument;
    if (returnExpression && returnExpression.type !== "ObjectExpression") {
      const location = returnExpression.loc;
      return location && location.start.line === location.end.line;
    }
  }
  return false;
}
