/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1472/javascript

import { AST, Rule } from 'eslint';
import * as estree from 'estree';
import { Position } from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      moveArguments: 'Make those call arguments start on line {{line}}.',
      moveTemplateLiteral: 'Make this template literal start on line {{line}}.',
    },
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;

    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        if (call.callee.type !== 'CallExpression' && call.arguments.length === 1) {
          const callee = getCallee(call);
          const parenthesis = sourceCode.getLastTokenBetween(
            callee,
            call.arguments[0],
            isClosingParen,
          );
          const calleeLastLine = (parenthesis ? parenthesis : sourceCode.getLastToken(callee))!.loc
            .end.line;
          const { start } = sourceCode.getTokenAfter(callee, isNotClosingParen)!.loc;
          if (calleeLastLine !== start.line) {
            const { end } = sourceCode.getLastToken(call)!.loc;
            if (end.line !== start.line) {
              //If arguments span multiple lines, we only report the first one
              reportIssue('moveArguments', start, calleeLastLine, context);
            } else {
              reportIssue('moveArguments', { start, end }, calleeLastLine, context);
            }
          }
        }
      },
      TaggedTemplateExpression(node) {
        const { quasi } = node;
        const tokenBefore = sourceCode.getTokenBefore(quasi);
        if (tokenBefore && quasi.loc && tokenBefore.loc.end.line !== quasi.loc.start.line) {
          const loc = {
            start: quasi.loc.start,
            end: {
              line: quasi.loc.start.line,
              column: quasi.loc.start.column + 1,
            },
          };
          reportIssue('moveTemplateLiteral', loc, tokenBefore.loc.start.line, context);
        }
      },
    };
  },
};

function getCallee(call: estree.CallExpression) {
  const node = call as TSESTree.CallExpression;
  return (node.typeParameters ?? node.callee) as estree.Node;
}

function isClosingParen(token: AST.Token) {
  return token.type === 'Punctuator' && token.value === ')';
}

function isNotClosingParen(token: AST.Token) {
  return !isClosingParen(token);
}

function reportIssue(
  messageId: string,
  loc: { start: Position; end: Position } | Position,
  line: number,
  context: Rule.RuleContext,
) {
  context.report({
    messageId,
    data: {
      line: line.toString(),
    },
    loc,
  });
}
