/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

import type { AST, Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, last } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import { CodeRecognizer, JavaScriptFootPrint } from '../helpers/recognizers/index.js';
import path from 'node:path';

const EXCLUDED_STATEMENTS = new Set(['BreakStatement', 'LabeledStatement', 'ContinueStatement']);

// Cheap prefilter: any meaningful JS statement must contain at least one of these characters,
// or be an import/export with a string literal (side-effect imports have no punctuation)
const CODE_CHAR_PATTERN = /[;{}()=<>]|\bimport\s+['"]|\bexport\s/;

const recognizer = new CodeRecognizer(0.9, new JavaScriptFootPrint());

interface GroupComment {
  value: string;
  nodes: TSESTree.Comment[];
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
          areAdjacentLineComments(last(currentGroup), comment)
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
        for (const groupComment of groupedComments) {
          const rawTextTrimmed = groupComment.value.trim();
          if (
            rawTextTrimmed !== '}' &&
            containsCode(injectMissingBraces(rawTextTrimmed), context)
          ) {
            context.report({
              messageId: 'commentedCode',
              loc: getCommentLocation(groupComment.nodes),
              suggest: [
                {
                  messageId: 'commentedCodeFix',
                  fix(fixer) {
                    const start = groupComment.nodes[0].range[0];
                    const end = last(groupComment.nodes).range[1];
                    return fixer.removeRange([start, end]);
                  },
                },
              ],
            });
          }
        }
      },
    };
  },
};

function isExpressionExclusion(
  statement: estree.Node,
  value: string,
  program: AST.Program,
  context: Rule.RuleContext,
) {
  if (statement.type === 'ExpressionStatement') {
    const expression = statement.expression;
    if (
      expression.type === 'Identifier' ||
      expression.type === 'SequenceExpression' ||
      isUnaryPlusOrMinus(expression) ||
      isExcludedLiteral(expression)
    ) {
      return true;
    }
    // Only construct SourceCode when we need getLastToken.
    // Access the constructor from context to avoid a static runtime import of 'eslint'.
    const SourceCodeClass = context.sourceCode.constructor as new (
      code: string,
      ast: AST.Program,
    ) => SourceCode;
    const code = new SourceCodeClass(value, program);
    return !code.getLastToken(statement, token => token.value === ';');
  }
  return false;
}

function isExclusion(
  parsedBody: Array<estree.Node>,
  value: string,
  program: AST.Program,
  context: Rule.RuleContext,
) {
  if (parsedBody.length === 1) {
    const singleStatement = parsedBody[0];
    return (
      EXCLUDED_STATEMENTS.has(singleStatement.type) ||
      isReturnThrowExclusion(singleStatement) ||
      isExpressionExclusion(singleStatement, value, program, context)
    );
  }
  return false;
}

function containsCode(value: string, context: Rule.RuleContext) {
  if (!CODE_CHAR_PATTERN.test(value) || !couldBeJsCode(value) || !context.languageOptions.parser) {
    return false;
  }

  try {
    const options = {
      ...context.languageOptions?.parserOptions,
      filePath: `placeholder${path.extname(context.filename)}`,
      programs: undefined,
      project: undefined,
    };
    //In case of Vue parser: we will use the JS/TS parser instead of the Vue parser
    const parser =
      context.languageOptions?.parserOptions?.parser ?? context.languageOptions?.parser;
    const result =
      'parse' in parser ? parser.parse(value, options) : parser.parseForESLint(value, options).ast;
    const program = result as AST.Program;
    return program.body.length > 0 && !isExclusion(program.body, value, program, context);
  } catch {
    return false;
  }
}

function couldBeJsCode(input: string): boolean {
  return input.split('\n').some(line => recognizer.recognition(line) >= recognizer.threshold);
}

function injectMissingBraces(value: string) {
  let balance = 0;
  let minBalance = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '{') {
      balance++;
    } else if (value[i] === '}') {
      balance--;
      if (balance < minBalance) {
        minBalance = balance;
      }
    }
  }
  const openToAdd = -minBalance;
  const closeToAdd = balance - minBalance;
  if (openToAdd > 0 || closeToAdd > 0) {
    return '{'.repeat(openToAdd) + value + '}'.repeat(closeToAdd);
  }
  return value;
}

function getCommentLocation(nodes: TSESTree.Comment[]) {
  return {
    start: nodes[0].loc.start,
    end: last(nodes).loc.end,
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
