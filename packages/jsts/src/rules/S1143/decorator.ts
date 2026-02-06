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
// https://sonarsource.github.io/rspec/#/rspec/S1143/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the no-unsafe-finally rule to suppress false positives for guard return patterns.
 *
 * Suppresses reports when a return statement in a finally block is:
 * 1. The only statement in an IfStatement's consequent (single-statement guard)
 * 2. The IfStatement's test is a simple Identifier (boolean flag check like `cancelled`)
 * 3. There are statements after the IfStatement in the finally block
 * 4. The return has no argument (void return, not overriding a value)
 *
 * This pattern is commonly used in React async effect cleanup to prevent
 * state updates on unmounted components.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (!('node' in reportDescriptor)) {
        context.report(reportDescriptor);
        return;
      }

      const node = reportDescriptor.node as TSESTree.Node;

      // Only handle ReturnStatement - other jump statements (break, continue, throw) are always flagged
      if (node.type !== 'ReturnStatement') {
        context.report(reportDescriptor);
        return;
      }

      // Return with argument is always flagged (could override return value)
      if (node.argument !== null) {
        context.report(reportDescriptor);
        return;
      }

      if (isGuardReturnInFinally(node)) {
        // Suppress the report - this is a valid guard pattern
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

/**
 * Checks if the return statement is a guard pattern in a finally block.
 *
 * Algorithm:
 * 1. Find the enclosing IfStatement
 * 2. Verify the return is the only statement in the consequent
 * 3. Verify the condition is a simple Identifier
 * 4. Find the finally block containing the IfStatement
 * 5. Verify there are statements after the IfStatement in the finally block
 */
function isGuardReturnInFinally(returnNode: TSESTree.ReturnStatement): boolean {
  // Step 1: Find the enclosing IfStatement
  const ifStatement = findEnclosingIfStatement(returnNode);
  if (!ifStatement) {
    return false;
  }

  // Step 2: Verify the return is the only statement in the consequent
  if (!isOnlyStatementInConsequent(returnNode, ifStatement)) {
    return false;
  }

  // Step 3: Verify the condition is a simple Identifier
  if (ifStatement.test.type !== 'Identifier') {
    return false;
  }

  // Step 4: Find the finally block containing the IfStatement
  const finallyBlock = findFinallyBlock(ifStatement);
  if (!finallyBlock) {
    return false;
  }

  // Step 5: Verify there are statements after the IfStatement
  return hasStatementsAfter(ifStatement, finallyBlock);
}

/**
 * Finds the immediate enclosing IfStatement for the return node.
 * The return must be directly inside the if's consequent.
 */
function findEnclosingIfStatement(
  returnNode: TSESTree.ReturnStatement,
): TSESTree.IfStatement | null {
  let parent = returnNode.parent;

  // Handle both `if (x) return;` and `if (x) { return; }`
  if (parent?.type === 'BlockStatement') {
    parent = parent.parent;
  }

  if (parent?.type === 'IfStatement') {
    return parent;
  }

  return null;
}

/**
 * Checks if the return is the only statement in the if's consequent.
 */
function isOnlyStatementInConsequent(
  returnNode: TSESTree.ReturnStatement,
  ifStatement: TSESTree.IfStatement,
): boolean {
  const consequent = ifStatement.consequent;

  // Direct return: if (x) return;
  if (consequent === returnNode) {
    return true;
  }

  // Block with single return: if (x) { return; }
  if (
    consequent.type === 'BlockStatement' &&
    consequent.body.length === 1 &&
    consequent.body[0] === returnNode
  ) {
    return true;
  }

  return false;
}

/**
 * Finds the finally block that contains the given if statement.
 */
function findFinallyBlock(ifStatement: TSESTree.IfStatement): TSESTree.BlockStatement | null {
  const tryStatement = findFirstMatchingAncestor(
    ifStatement,
    node => node.type === 'TryStatement',
  ) as TSESTree.TryStatement | undefined;

  if (!tryStatement?.finalizer) {
    return null;
  }

  // Verify the if statement is actually inside the finally block
  const finalizer = tryStatement.finalizer;
  if (isDescendantOf(ifStatement, finalizer)) {
    return finalizer;
  }

  return null;
}

/**
 * Checks if child is a descendant of parent.
 */
function isDescendantOf(child: TSESTree.Node, parent: TSESTree.BlockStatement): boolean {
  let current: TSESTree.Node | undefined = child;
  while (current) {
    if (current === parent) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Checks if there are statements after the if statement in the finally block.
 */
function hasStatementsAfter(
  ifStatement: TSESTree.IfStatement,
  finallyBlock: TSESTree.BlockStatement,
): boolean {
  const statements = finallyBlock.body;
  const ifIndex = statements.indexOf(ifStatement);

  // The if must be a direct child of the finally block
  if (ifIndex === -1) {
    return false;
  }

  // There must be statements after the if
  return ifIndex < statements.length - 1;
}
