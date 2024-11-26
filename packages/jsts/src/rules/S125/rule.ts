/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S125/javascript

import { Rule, SourceCode } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import babel from '@babel/eslint-parser';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';
import { CodeRecognizer, JavaScriptFootPrint } from '../helpers/recognizers/index.js';

import babelPresetReact from '@babel/preset-react';
import babelPresetFlow from '@babel/preset-flow';
import babelPresetEnv from '@babel/preset-env';
import babelPluginDecorators from '@babel/plugin-proposal-decorators';

const EXCLUDED_STATEMENTS = ['BreakStatement', 'LabeledStatement', 'ContinueStatement'];

const recognizer = new CodeRecognizer(0.9, new JavaScriptFootPrint());

interface GroupComment {
  value: string;
  nodes: TSESTree.Comment[];
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      commentedCode: 'Remove this commented out code.',
      commentedCodeFix: 'Remove this commented out code',
    },
    hasSuggestions: true,
  }),
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
        const nextCodeToken = context.sourceCode.getTokenAfter(previous);
        return !nextCodeToken || nextCodeToken.loc.start.line > nextCommentLine;
      }
      return false;
    }

    return {
      'Program:exit': () => {
        const groupedComments = getGroupedComments(
          context.sourceCode.getAllComments() as TSESTree.Comment[],
        );
        groupedComments.forEach(groupComment => {
          const rawTextTrimmed = groupComment.value.trim();
          if (rawTextTrimmed !== '}' && containsCode(injectMissingBraces(rawTextTrimmed))) {
            context.report({
              messageId: 'commentedCode',
              loc: getCommentLocation(groupComment.nodes),
              suggest: [
                {
                  messageId: 'commentedCodeFix',
                  fix(fixer) {
                    const start = groupComment.nodes[0].range[0];
                    const end = groupComment.nodes[groupComment.nodes.length - 1].range[1];
                    return fixer.removeRange([start, end]);
                  },
                },
              ],
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

function containsCode(value: string) {
  if (!couldBeJsCode(value)) {
    return false;
  }

  try {
    const result = babel.parse(value, {
      filename: 'some/filePath',
      tokens: true,
      comment: true,
      loc: true,
      range: true,
      ecmaVersion: 2018,
      sourceType: 'module',
      codeFrame: false,
      ecmaFeatures: {
        jsx: true,
        globalReturn: false,
        legacyDecorators: true,
      },
      requireConfigFile: false,
      babelOptions: {
        targets: 'defaults',
        presets: [babelPresetReact, babelPresetFlow, babelPresetEnv],
        plugins: [[babelPluginDecorators, { version: '2022-03' }]],
        babelrc: false,
        configFile: false,
        parserOpts: {
          allowReturnOutsideFunction: true,
        },
      },
    });
    const parseResult = new SourceCode(value, result);
    return parseResult.ast.body.length > 0 && !isExclusion(parseResult.ast.body, parseResult);
  } catch (exception) {
    return false;
  }

  function couldBeJsCode(input: string): boolean {
    return recognizer.extractCodeLines(input.split('\n')).length > 0;
  }
}

function injectMissingBraces(value: string) {
  const openCurlyBraceNum = (value.match(/{/g) ?? []).length;
  const closeCurlyBraceNum = (value.match(/}/g) ?? []).length;
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
