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

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const LOOP_TYPES = new Set([
  'ForStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
]);

function isLoop(node: estree.Node): boolean {
  return LOOP_TYPES.has(node.type);
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeLabel: 'Refactor the code to remove this label and the need for it.',
    },
  }),
  create(context: Rule.RuleContext) {
    // Stack of currently active LabeledStatement nodes (innermost last).
    const labelStack: estree.LabeledStatement[] = [];
    // Map from LabeledStatement node to array of booleans.
    // Each boolean indicates whether the corresponding break/continue
    // referencing the label is nested inside an inner loop.
    const labelRefs = new Map<estree.LabeledStatement, boolean[]>();

    function onBreakOrContinue(node: estree.BreakStatement | estree.ContinueStatement) {
      if (!node.label) {
        return;
      }
      const labelName = node.label.name;

      // Find the latest matching label on the stack.
      let labeledStmt: estree.LabeledStatement | undefined;
      for (let i = labelStack.length - 1; i >= 0; i--) {
        if (labelStack[i].label.name === labelName) {
          labeledStmt = labelStack[i];
          break;
        }
      }
      if (!labeledStmt) {
        return;
      }

      const ancestors = context.sourceCode.getAncestors(node);
      const labelIdx = ancestors.indexOf(labeledStmt);
      // ancestors[labelIdx+1] is the labeled body (the loop itself).
      // Check if any ancestor beyond the loop body is itself a loop,
      // indicating this break/continue is inside a nested inner loop.
      const hasNested = ancestors.slice(labelIdx + 2).some(isLoop);

      const refs = labelRefs.get(labeledStmt);
      if (refs) {
        refs.push(hasNested);
      } else {
        labelRefs.set(labeledStmt, [hasNested]);
      }
    }

    return {
      LabeledStatement(node) {
        labelStack.push(node);
      },

      BreakStatement: onBreakOrContinue,
      ContinueStatement: onBreakOrContinue,

      'LabeledStatement:exit'(node) {
        labelStack.pop();

        // If the labeled body is not a loop, always report
        if (!isLoop(node.body)) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        const refs = labelRefs.get(node);
        labelRefs.delete(node);

        // No references: label on loop is unused → report
        if (!refs || refs.length === 0) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        // Report if any reference is not from within a nested loop
        if (refs.some(isFromNestedLoop => !isFromNestedLoop)) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
        }

        // All references are multi-level loop exits: suppress
      },
    };
  },
};
