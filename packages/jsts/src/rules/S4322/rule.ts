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
// https://sonarsource.github.io/rspec/#/rspec/S4322/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { getMainFunctionTokenLocation } from 'eslint-plugin-sonarjs/lib/utils/locations';
import { getParent, RuleContext, isUndefined } from '../helpers';

type FunctionLikeDeclaration = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      useTypePredicate:
        'Declare this function return type using type predicate "{{castedExpressionText}} is {{castedTypeText}}".',
      suggestTypePredicate: 'Use type predicate',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      "MethodDefinition[kind='method'] FunctionExpression"(node: estree.Node) {
        checkFunctionLikeDeclaration(node as FunctionLikeDeclaration, context);
      },
      FunctionDeclaration(node: estree.Node) {
        checkFunctionLikeDeclaration(node as FunctionLikeDeclaration, context);
      },
    };
  },
};

function checkFunctionLikeDeclaration(
  functionDeclaration: FunctionLikeDeclaration,
  context: Rule.RuleContext,
) {
  if (
    functionDeclaration.returnType &&
    functionDeclaration.returnType.typeAnnotation.type === 'TSTypePredicate'
  ) {
    return;
  }

  const body = functionDeclaration.body;
  const returnedExpression = getReturnedExpression(body);
  if (!returnedExpression) {
    return;
  }

  if (isInequalityBinaryExpression(returnedExpression)) {
    const { left, right } = returnedExpression;
    if (isUndefined(right)) {
      checkCastedType(functionDeclaration, left, context);
    } else if (isUndefined(left)) {
      checkCastedType(functionDeclaration, right, context);
    }
  } else if (isBooleanCall(returnedExpression)) {
    checkCastedType(functionDeclaration, returnedExpression.arguments[0], context);
  } else if (isNegation(returnedExpression) && isNegation(returnedExpression.argument)) {
    checkCastedType(functionDeclaration, returnedExpression.argument.argument, context);
  }
}

function getReturnedExpression(
  block?: TSESTree.BlockStatement | null,
): TSESTree.Expression | undefined | null {
  if (block && block.body.length === 1) {
    const statement = block.body[0];
    if (statement.type === 'ReturnStatement') {
      return statement.argument;
    }
  }
  return undefined;
}

function isInequalityBinaryExpression(
  returnExpression: TSESTree.Expression,
): returnExpression is TSESTree.BinaryExpression {
  return (
    returnExpression.type === 'BinaryExpression' &&
    (returnExpression.operator === '!==' || returnExpression.operator === '!=')
  );
}

function checkCastedType(
  node: FunctionLikeDeclaration,
  expression: TSESTree.Node,
  context: Rule.RuleContext,
) {
  const sourceCode = context.sourceCode;
  const castedType = getCastTupleFromMemberExpression(expression);
  if (castedType && (castedType[1] as TSESTree.Node).type !== 'TSAnyKeyword') {
    const nOfParam = node.params.length;
    if (nOfParam === 1 || (nOfParam === 0 && castedType[0].type === 'ThisExpression')) {
      const castedExpressionText = sourceCode.getText(castedType[0]);
      const castedTypeText = sourceCode.getText(castedType[1]);
      const predicate = `: ${castedExpressionText} is ${castedTypeText}`;
      const suggest = getTypePredicateSuggestion(node, context, predicate);
      context.report({
        messageId: 'useTypePredicate',
        data: {
          castedExpressionText,
          castedTypeText,
        },
        loc: getMainFunctionTokenLocation(
          node as TSESTree.FunctionLike,
          getParent(context) as TSESTree.Node,
          context as unknown as RuleContext,
        ),
        suggest,
      });
    }
  }
}

function getTypePredicateSuggestion(
  node: FunctionLikeDeclaration,
  context: Rule.RuleContext,
  predicate: string,
) {
  const suggestions: Rule.SuggestionReportDescriptor[] = [];
  let fix: (fixer: Rule.RuleFixer) => Rule.Fix;
  if (node.returnType) {
    fix = fixer => fixer.replaceText(node.returnType as unknown as estree.Node, predicate);
  } else {
    const closingParenthesis = context.sourceCode.getTokenBefore(
      node.body as estree.Node,
      token => token.value === ')',
    )!;
    fix = fixer => fixer.insertTextAfter(closingParenthesis, predicate);
  }
  suggestions.push({ messageId: 'suggestTypePredicate', fix });
  return suggestions;
}

function getCastTupleFromMemberExpression(
  node: TSESTree.Node,
): [estree.Node, estree.Node] | undefined {
  if (node.type === 'MemberExpression') {
    const object = node.object as TSESTree.Node;
    if (object.type === 'TSAsExpression' || object.type === 'TSTypeAssertion') {
      return [object.expression as estree.Node, object.typeAnnotation as unknown as estree.Node];
    }
  }
  return undefined;
}

function isNegation(node: TSESTree.Expression): node is TSESTree.UnaryExpression {
  return node.type === 'UnaryExpression' && node.prefix && node.operator === '!';
}

function isBooleanCall(node: TSESTree.Expression): node is TSESTree.CallExpression {
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    return node.arguments.length === 1 && callee.type === 'Identifier' && callee.name === 'Boolean';
  }
  return false;
}
