/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3524/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import type { RuleModule } from '../../../../shared/src/types/rule';

const MESSAGE_ADD_PARAMETER = 'Add parentheses around the parameter of this arrow function.';
const MESSAGE_REMOVE_PARAMETER = 'Remove parentheses around the parameter of this arrow function.';
const MESSAGE_ADD_BODY = 'Add curly braces and "return" to this arrow function body.';
const MESSAGE_REMOVE_BODY = 'Remove curly braces and "return" from this arrow function body.';

export type Options = [
  {
    requireParameterParentheses: boolean;
    requireBodyBraces: boolean;
  },
];

export const rule: RuleModule<Options> = {
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          requireParameterParentheses: {
            type: 'boolean',
          },
          requireBodyBraces: {
            type: 'boolean',
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
  if (arrowFunction.params.length !== 1) {
    return;
  }
  const parameter = arrowFunction.params[0];
  // Looking at the closing parenthesis after the parameter to avoid problems with cases like
  // `functionTakingCallbacks(x => {...})` where the opening parenthesis before `x` isn't part
  // of the function literal
  const tokenAfterParameter = context.sourceCode.getTokenAfter(parameter);
  const hasParameterParentheses = tokenAfterParameter && tokenAfterParameter.value === ')';

  if (requireParameterParentheses && !hasParameterParentheses) {
    context.report({ node: parameter, message: MESSAGE_ADD_PARAMETER });
  } else if (
    !requireParameterParentheses &&
    !hasGeneric(context, arrowFunction) &&
    hasParameterParentheses
  ) {
    const arrowFunctionComments = context.sourceCode.getCommentsInside(arrowFunction);
    const arrowFunctionBodyComments = context.sourceCode.getCommentsInside(arrowFunction.body);
    // parameters comments inside parentheses are not available, so use the following subtraction:
    const hasArrowFunctionParamsComments =
      arrowFunctionComments.filter(comment => !arrowFunctionBodyComments.includes(comment)).length >
      0;
    if (
      parameter.type === 'Identifier' &&
      !hasArrowFunctionParamsComments &&
      !(parameter as TSESTree.Identifier).typeAnnotation &&
      !(arrowFunction as TSESTree.ArrowFunctionExpression).returnType
    ) {
      context.report({ node: parameter, message: MESSAGE_REMOVE_PARAMETER });
    }
  }
}

function hasGeneric(context: Rule.RuleContext, arrowFunction: estree.ArrowFunctionExpression) {
  const offset = arrowFunction.async ? 1 : 0;
  const firstTokenIgnoreAsync = context.sourceCode.getFirstToken(arrowFunction, offset);
  return firstTokenIgnoreAsync && firstTokenIgnoreAsync.value === '<';
}

function checkBody(
  context: Rule.RuleContext,
  requireBodyBraces: boolean,
  arrowFunction: estree.ArrowFunctionExpression,
) {
  const hasBodyBraces = arrowFunction.body.type === 'BlockStatement';
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
  if (statement.type === 'ReturnStatement') {
    const returnStatement = statement;
    const returnExpression = returnStatement.argument;
    if (returnExpression && returnExpression.type !== 'ObjectExpression') {
      const location = returnExpression.loc;
      return location && location.start.line === location.end.line;
    }
  }
  return false;
}
