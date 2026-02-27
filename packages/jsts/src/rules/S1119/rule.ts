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
// https://sonarsource.github.io/rspec/#/rspec/S1119/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf, generateMeta, isFunctionNode, type LoopLike } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const LOOP_TYPES = new Set([
  'ForStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
]);

function isLoop(node: estree.Node): node is LoopLike {
  return LOOP_TYPES.has(node.type);
}

/**
 * Collects ancestor chains for all break/continue statements referencing
 * `labelName` within `current`, stopping at function boundaries.
 * Each entry in `result` is the ancestor chain from the start of traversal
 * down to the statement's immediate parent.
 */
function collectLabelRefAncestors(
  current: estree.Node,
  labelName: string,
  ancestorChain: estree.Node[],
  visitorKeys: SourceCode.VisitorKeys,
  result: estree.Node[][],
): void {
  if (isFunctionNode(current)) {
    return;
  }

  if (
    (current.type === 'BreakStatement' || current.type === 'ContinueStatement') &&
    (current as estree.BreakStatement | estree.ContinueStatement).label?.name === labelName
  ) {
    result.push(ancestorChain);
  }

  for (const child of childrenOf(current, visitorKeys)) {
    collectLabelRefAncestors(child, labelName, [...ancestorChain, current], visitorKeys, result);
  }
}

/**
 * Returns true if the ancestor chain contains at least one loop node
 * that is nested inside the labeled loop (i.e., appears after it in the chain).
 */
function hasNestedLoop(labeledLoop: LoopLike, ancestors: estree.Node[]): boolean {
  let foundLabeledLoop = false;
  for (const ancestor of ancestors) {
    if (ancestor === labeledLoop) {
      foundLabeledLoop = true;
      continue;
    }
    if (foundLabeledLoop && isLoop(ancestor)) {
      return true;
    }
  }
  return false;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeLabel: 'Refactor the code to remove this label and the need for it.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      LabeledStatement(node) {
        const body = node.body;

        // If the labeled body is not a loop, always report
        if (!isLoop(body)) {
          context.report({
            messageId: 'removeLabel',
            loc: context.sourceCode.getFirstToken(node)!.loc,
          });
          return;
        }

        // Collect ancestor chains for all break/continue referencing this label
        const refAncestors: estree.Node[][] = [];
        collectLabelRefAncestors(
          body,
          node.label.name,
          [],
          context.sourceCode.visitorKeys,
          refAncestors,
        );

        // No references: label on loop is unused → report
        if (refAncestors.length === 0) {
          context.report({
            messageId: 'removeLabel',
            loc: context.sourceCode.getFirstToken(node)!.loc,
          });
          return;
        }

        // Report if any reference is not from within a nested loop
        for (const ancestors of refAncestors) {
          if (!hasNestedLoop(body, ancestors)) {
            context.report({
              messageId: 'removeLabel',
              loc: context.sourceCode.getFirstToken(node)!.loc,
            });
            return;
          }
        }

        // All references are multi-level loop exits: suppress
      },
    };
  },
};
