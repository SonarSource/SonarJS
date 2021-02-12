/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-125

import { Rule, SourceCode } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { parseJavaScriptSourceFile } from '../parser';
import { ParsingError } from '../analyzer';

const EXCLUDED_STATEMENTS = ['BreakStatement', 'LabeledStatement', 'ContinueStatement'];

interface GroupComment {
  value: string;
  nodes: TSESTree.Comment[];
}

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    function getGroupedComments(comments: TSESTree.Comment[]): GroupComment[] {
      const groupedComments: GroupComment[] = [];
      let currentGroup: TSESTree.Comment[] = [];
      for (const comment of comments) {
        if (comment.type === 'Block') {
          groupedComments.push({ value: comment.value, nodes: [comment] });
        } else if (
          currentGroup.length === 0 ||
          areAdjacentLineComments(currentGroup[currentGroup.length - 1], comment)
        ) {
          currentGroup.push(comment);
        } else {
          groupedComments.push({
            value: currentGroup.map(lineComment => lineComment.value).join('\n'),
            nodes: currentGroup,
          });
          currentGroup = [comment];
        }
      }

      if (currentGroup.length > 0) {
        groupedComments.push({
          value: currentGroup.map(lineComment => lineComment.value).join('\n'),
          nodes: currentGroup,
        });
      }

      return groupedComments;
    }

    function areAdjacentLineComments(previous: TSESTree.Comment, next: TSESTree.Comment) {
      const nextCommentLine = next.loc.start.line;
      if (previous.loc.start.line + 1 === nextCommentLine) {
        const nextCodeToken = context.getSourceCode().getTokenAfter(previous);
        return !nextCodeToken || nextCodeToken.loc.start.line > nextCommentLine;
      }
      return false;
    }

    return {
      'Program:exit': () => {
        const groupedComments = getGroupedComments(
          context.getSourceCode().getAllComments() as TSESTree.Comment[],
        );
        groupedComments.forEach(groupComment => {
          const rawTextTrimmed = groupComment.value.trim();
          if (
            rawTextTrimmed !== '}' &&
            containsCode(injectMissingBraces(rawTextTrimmed), context.getFilename())
          ) {
            context.report({
              message: 'Remove this commented out code.',
              loc: getCommentLocation(groupComment.nodes),
            });
          }
        });
      },
    };
  },
};

function isExpressionExclusion(statement: estree.Node, code: SourceCode) {
  if (statement.type === 'ExpressionStatement') {
    const expression = statement.expression;
    if (
      expression.type === 'Identifier' ||
      expression.type === 'SequenceExpression' ||
      isUnaryPlusOrMinus(expression) ||
      isExcludedLiteral(expression) ||
      !code.getLastToken(statement, token => token.value === ';')
    ) {
      return true;
    }
  }
  return false;
}

function isExclusion(parsedBody: Array<estree.Node>, code: SourceCode) {
  if (parsedBody.length === 1) {
    const singleStatement = parsedBody[0];
    return (
      EXCLUDED_STATEMENTS.includes(singleStatement.type) ||
      isReturnThrowExclusion(singleStatement) ||
      isExpressionExclusion(singleStatement, code)
    );
  }
  return false;
}

function containsCode(value: string, filename: string) {
  const parseResult = parseJavaScriptSourceFile(value, filename);
  return (
    isSourceCode(parseResult) &&
    parseResult.ast.body.length > 0 &&
    !isExclusion(parseResult.ast.body, parseResult)
  );
}

function injectMissingBraces(value: string) {
  const openCurlyBraceNum = (value.match(/{/g) || []).length;
  const closeCurlyBraceNum = (value.match(/}/g) || []).length;
  const missingBraces = openCurlyBraceNum - closeCurlyBraceNum;
  if (missingBraces > 0) {
    return value + Array(missingBraces).fill('}').join('');
  } else if (missingBraces < 0) {
    return Array(-missingBraces).fill('{').join('') + value;
  } else {
    return value;
  }
}

function getCommentLocation(nodes: TSESTree.Comment[]) {
  return {
    start: nodes[0].loc.start,
    end: nodes[nodes.length - 1].loc.end,
  };
}

function isSourceCode(parseResult: SourceCode | ParsingError): parseResult is SourceCode {
  return !!(parseResult as SourceCode).ast;
}

function isReturnThrowExclusion(statement: estree.Node) {
  if (statement.type === 'ReturnStatement' || statement.type === 'ThrowStatement') {
    return statement.argument == null || statement.argument.type === 'Identifier';
  }
  return false;
}

function isUnaryPlusOrMinus(expression: estree.Expression) {
  return (
    expression.type === 'UnaryExpression' &&
    (expression.operator === '+' || expression.operator === '-')
  );
}

function isExcludedLiteral(expression: estree.Expression) {
  if (expression.type === 'Literal') {
    return typeof expression.value === 'string' || typeof expression.value === 'number';
  }
  return false;
}
