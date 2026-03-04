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

function isSwitch(node: estree.Node): boolean {
  return node.type === 'SwitchStatement';
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
    // Each boolean is true if the break/continue is inside a nested loop or switch,
    // meaning it legitimately needs the label to exit the enclosing construct.
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
      // ancestors[labelIdx+1] is the labeled body.
      // True if the break/continue is inside a nested loop or switch:
      // - nested loop: break/continue must target the label to exit multiple levels
      // - nested switch: plain 'break' only exits the switch, so 'break label' is the
      //   only way to exit the enclosing loop from within the switch
      const isNested = ancestors.slice(labelIdx + 2).some(n => isLoop(n) || isSwitch(n));

      const refs = labelRefs.get(labeledStmt);
      if (refs) {
        refs.push(isNested);
      } else {
        labelRefs.set(labeledStmt, [isNested]);
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

        const refs = labelRefs.get(node);
        labelRefs.delete(node);

        // Non-loop labeled body: always report (labels on blocks, if-statements, etc.)
        if (!isLoop(node.body)) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        // No references: label on loop is unused → report
        if (!refs || refs.length === 0) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        // Report if any reference is not from within a nested loop or switch.
        // Suppress if all references legitimately need the label (nested loop or switch exits).
        if (refs.some(r => !r)) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
        }
      },
    };
  },
};
