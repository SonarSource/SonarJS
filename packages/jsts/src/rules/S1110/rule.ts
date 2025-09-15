/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1110/javascript

import { AST, Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { generateMeta, getParent, report, toSecondaryLocation } from '../helpers/index.js';
import * as meta from './generated-meta.js';

interface ParenthesesPair {
  openingParenthesis: AST.Token;
  closingParenthesis: AST.Token;
}

/**
 * Parts of the grammar that are required to have parentheses.
 */
const parenthesized: { [key: string]: string } = {
  DoWhileStatement: 'test',
  IfStatement: 'test',
  SwitchStatement: 'discriminant',
  WhileStatement: 'test',
  WithStatement: 'object',
  ArrowFunctionExpression: 'body',
  ImportExpression: 'source',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    return {
      '*'(node: estree.Node) {
        checkRedundantParentheses(context.sourceCode, node, context);
      },
    };
  },
};

function checkRedundantParentheses(
  sourceCode: SourceCode,
  node: estree.Node,
  context: Rule.RuleContext,
) {
  const parenthesesPairsAroundNode = getParenthesesPairsAround(sourceCode, node, node);
  const parent = getParent(context, node);

  // Ignore parentheses pair from the parent node
  if (!!parent && isInParentNodeParentheses(node, parent)) {
    parenthesesPairsAroundNode.pop();
  }
  // One pair of parentheses is allowed for readability purposes
  parenthesesPairsAroundNode.shift();

  for (const parentheses of parenthesesPairsAroundNode) {
    report(
      context,
      {
        message: `Remove these redundant parentheses.`,
        loc: parentheses.openingParenthesis.loc,
        suggest: [
          {
            desc: 'Remove these redundant parentheses',
            fix(fixer) {
              return [
                fixer.remove(parentheses.openingParenthesis),
                fixer.remove(parentheses.closingParenthesis),
              ];
            },
          },
        ],
      },
      [toSecondaryLocation(parentheses.closingParenthesis)],
    );
  }
}

function getParenthesesPairsAround(
  sourceCode: SourceCode,
  start: estree.Node | AST.Token,
  end: estree.Node | AST.Token,
): ParenthesesPair[] {
  const tokenBefore = sourceCode.getTokenBefore(start);
  const tokenAfter = sourceCode.getTokenAfter(end);

  if (!!tokenBefore && !!tokenAfter && tokenBefore.value === '(' && tokenAfter.value === ')') {
    return [
      { openingParenthesis: tokenBefore, closingParenthesis: tokenAfter },
      ...getParenthesesPairsAround(sourceCode, tokenBefore, tokenAfter),
    ];
  }

  return [];
}

function isInParentNodeParentheses(node: estree.Node, parent: estree.Node): boolean {
  // Applying same logic as https://github.com/eslint/eslint/blob/main/lib/rules/no-sequences.js#L81
  // both rules (S1110 and S878) can contradict each other, so better use the same logic
  const parentAttribute = parenthesized[parent.type as keyof typeof parenthesized];
  const nodeIsInConditionOfParent =
    parentAttribute &&
    node === (parent[parentAttribute as keyof estree.Node] as unknown as estree.Node);

  const nodeIsArgumentOfCallExpression =
    (parent.type === 'CallExpression' || parent.type === 'NewExpression') &&
    parent.arguments.includes(node as estree.Expression);

  return nodeIsInConditionOfParent || nodeIsArgumentOfCallExpression;
}
