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
// Greatly inspired by https://github.com/eslint/eslint/blob/561b6d4726f3e77dd40ba0d340ca7f08429cd2eb/lib/rules/max-lines-per-function.js
// We had to fork the implementation to control the reporting (issue location), in order to provide a better user experience.

// https://sonarsource.github.io/rspec/#/rspec/S138/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { getMainFunctionTokenLocation } from 'eslint-plugin-sonarjs/lib/utils/locations';
import { getNodeParent, getParent, last, RuleContext } from '../helpers';

interface FunctionKnowledge {
  node: estree.Node;
  lineCount: number;
  startsWithCapital: boolean;
  returnsJSX: boolean;
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      functionMaxLine:
        'This function has {{lineCount}} lines, which is greater than the {{threshold}} lines authorized. Split it into smaller functions.',
    },
    schema: [{ type: 'integer' }],
  },
  create(context: Rule.RuleContext) {
    const [threshold] = context.options;

    const sourceCode = context.sourceCode;
    const lines = sourceCode.lines;

    const commentLineNumbers = getCommentLineNumbers(sourceCode.getAllComments());

    const functionStack: estree.Node[] = [];
    const functionKnowledge = new Map<estree.Node, FunctionKnowledge>();
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) => {
        functionStack.push(node);
        const parent = getParent(context);

        if (!node.loc || isIIFE(node, parent as estree.Node)) {
          return;
        }

        const lineCount = getLocsNumber(node.loc, lines, commentLineNumbers);
        const startsWithCapital = nameStartsWithCapital(node);
        functionKnowledge.set(node, { node, lineCount, startsWithCapital, returnsJSX: false });
      },
      ReturnStatement: (node: estree.Node) => {
        const returnStatement = node as estree.ReturnStatement;
        const knowledge = functionKnowledge.get(last(functionStack));
        if (
          knowledge &&
          returnStatement.argument &&
          (returnStatement.argument as any).type.startsWith('JSX')
        ) {
          knowledge.returnsJSX = true;
        }
      },
      'FunctionDeclaration:exit': () => {
        functionStack.pop();
      },
      'FunctionExpression:exit': () => {
        functionStack.pop();
      },
      'ArrowFunctionExpression:exit': () => {
        functionStack.pop();
      },
      'Program:exit': () => {
        for (const knowledge of functionKnowledge.values()) {
          const { node, lineCount } = knowledge;
          if (lineCount > threshold && !isReactFunctionComponent(knowledge)) {
            const functionLike = node as TSESTree.FunctionLike;
            context.report({
              messageId: 'functionMaxLine',
              data: {
                lineCount: lineCount.toString(),
                threshold,
              },
              loc: getMainFunctionTokenLocation(
                functionLike,
                functionLike.parent,
                context as unknown as RuleContext,
              ),
            });
          }
        }
      },
    };
  },
};

export function getLocsNumber(
  loc: estree.SourceLocation,
  lines: string[],
  commentLineNumbers: Map<number, estree.Comment>,
) {
  let lineCount = 0;

  for (let i = loc.start.line - 1; i < loc.end.line; ++i) {
    const line = lines[i];
    const comment = commentLineNumbers.get(i + 1);
    if (comment && isFullLineComment(line, i + 1, comment)) {
      continue;
    }

    if (line.match(/^\s*$/u)) {
      continue;
    }

    lineCount++;
  }

  return lineCount;
}

export function getCommentLineNumbers(comments: estree.Comment[]): Map<number, estree.Comment> {
  const map = new Map();

  comments.forEach(comment => {
    if (comment.loc) {
      for (let i = comment.loc.start.line; i <= comment.loc.end.line; i++) {
        map.set(i, comment);
      }
    }
  });
  return map;
}

function isFullLineComment(line: string, lineNumber: number, comment: estree.Comment) {
  if (!comment.loc) {
    return false;
  }
  const { start, end } = comment.loc;
  const isFirstTokenOnLine = start.line === lineNumber && !line.slice(0, start.column).trim();
  const isLastTokenOnLine = end.line === lineNumber && !line.slice(end.column).trim();

  return (
    comment &&
    (start.line < lineNumber || isFirstTokenOnLine) &&
    (end.line > lineNumber || isLastTokenOnLine)
  );
}

function isIIFE(node: estree.Node, parent: estree.Node) {
  return (
    node.type === 'FunctionExpression' &&
    parent &&
    parent.type === 'CallExpression' &&
    parent.callee === node
  );
}

function isReactFunctionComponent(knowledge: FunctionKnowledge) {
  return knowledge.startsWithCapital && knowledge.returnsJSX;
}

function nameStartsWithCapital(node: estree.Node) {
  const identifier = getIdentifierFromNormalFunction(node) ?? getIdentifierFromArrowFunction(node);

  if (!identifier) {
    return false;
  }
  return isIdentifierUppercase(identifier);

  /**
   * Picks `Foo` from: `let Foo = () => {}`
   */
  function getIdentifierFromArrowFunction(node: estree.Node) {
    if (node.type !== 'ArrowFunctionExpression') {
      return null;
    }
    const parent = getNodeParent(node);
    if (!parent) {
      return null;
    }
    if (parent.type === 'VariableDeclarator') {
      return parent.id as estree.Identifier;
    } else {
      return null;
    }
  }

  /**
   * Picks `Foo` from:
   * - `function Foo() {}`
   * - `let bar = function Foo() {}`
   */
  function getIdentifierFromNormalFunction(node: estree.Node) {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      return node.id;
    }
  }

  function isIdentifierUppercase(node: estree.Identifier) {
    return node.name.startsWith(node.name[0].toUpperCase());
  }
}
