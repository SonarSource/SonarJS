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
// https://sonarsource.github.io/rspec/#/rspec/S2310/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  getNodeParent,
  getParent,
  getVariableFromName,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),

  create(context: Rule.RuleContext) {
    function checkLoop<T>(
      updateNode: T,
      extractCounters: (updateNode: T, counters: estree.Identifier[]) => void,
      loopBody: estree.Node,
    ) {
      const counters: estree.Identifier[] = [];
      extractCounters(updateNode, counters);
      for (const counter of counters) {
        checkCounter(counter, loopBody as estree.BlockStatement);
      }
    }

    function checkCounter(counter: estree.Identifier, block: estree.Node) {
      const variable = getVariableFromName(context, counter.name, block);
      if (!variable) {
        return;
      }
      for (const ref of variable.references) {
        if (ref.isWrite() && isUsedInsideBody(ref.identifier, block)) {
          if (isIntentionalSkipAhead(ref.identifier, block)) {
            continue;
          }
          report(
            context,
            {
              node: ref.identifier,
              message: `Remove this assignment of "${counter.name}".`,
            },

            [toSecondaryLocation(counter, 'Counter variable update')],
          );
        }
      }
    }

    return {
      'ForStatement > BlockStatement': (node: estree.Node) => {
        const forLoop = getParent(context, node) as estree.ForStatement;
        if (forLoop.update) {
          checkLoop(forLoop.update, collectCountersFor, node);
        }
      },
      // Note: for-of and for-in loops are not checked because reassigning
      // the iterator variable does not affect loop iteration (the iterator
      // protocol controls progression, not the variable value)
    };
  },
};

function collectCountersFor(updateExpression: estree.Expression, counters: estree.Identifier[]) {
  let counter: estree.Node | null | undefined = undefined;

  if (updateExpression.type === 'AssignmentExpression') {
    counter = updateExpression.left;
  } else if (updateExpression.type === 'UpdateExpression') {
    counter = updateExpression.argument;
  } else if (updateExpression.type === 'SequenceExpression') {
    for (const e of updateExpression.expressions) {
      collectCountersFor(e, counters);
    }
  }

  if (counter?.type === 'Identifier') {
    counters.push(counter);
  }
}

/**
 * Checks if a loop counter modification is an intentional skip-ahead pattern
 * (UpdateExpression or compound assignment) rather than a simple assignment.
 * Simple assignments (=) are allowed when a splice() call using the same
 * counter variable exists in the enclosing block (splice compensation pattern).
 * Modifications in nested for-loop update clauses are not considered skip-ahead.
 */
function isIntentionalSkipAhead(id: estree.Identifier, outerLoopBody: estree.Node): boolean {
  if (isInNestedForLoopUpdate(id, outerLoopBody)) {
    return false;
  }
  const parent = getNodeParent(id);
  if (parent?.type === 'UpdateExpression') {
    return true;
  }
  if (parent?.type === 'AssignmentExpression' && parent.operator !== '=') {
    return true;
  }
  if (parent?.type === 'AssignmentExpression' && parent.operator === '=') {
    const block = findEnclosingBlock(id);
    if (block && blockContainsSpliceWithCounter(block, id.name)) {
      return true;
    }
  }
  return false;
}

/**
 * Walks up the AST from the given node to find the nearest enclosing BlockStatement.
 */
function findEnclosingBlock(node: estree.Node): estree.BlockStatement | undefined {
  let current: estree.Node | undefined = getNodeParent(node);
  while (current) {
    if (current.type === 'BlockStatement') {
      return current;
    }
    current = getNodeParent(current);
  }
  return undefined;
}

/**
 * Checks whether a block contains a splice() call whose first argument
 * is an Identifier matching the given counter variable name.
 */
function blockContainsSpliceWithCounter(
  block: estree.BlockStatement,
  counterName: string,
): boolean {
  return block.body.some(stmt => containsSpliceWithCounter(stmt, counterName));
}

/**
 * Checks whether a statement contains a splice() call whose first argument
 * references the given counter variable name. Only checks direct statements
 * in the block — not ones nested inside conditional branches.
 */
function containsSpliceWithCounter(node: estree.Node, counterName: string): boolean {
  if (node.type === 'ExpressionStatement') {
    return expressionContainsSplice(node.expression, counterName);
  }
  if (
    node.type === 'VariableDeclaration' &&
    node.declarations.some(
      d => d.init?.type === 'CallExpression' && isSpliceCallWithCounter(d.init, counterName),
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Checks whether an expression is or contains a splice() call whose first argument
 * matches the given counter variable name. Handles both direct splice calls
 * and splice calls on the right side of assignments (e.g., removed = arr.splice(i, 1)).
 */
function expressionContainsSplice(expr: estree.Expression, counterName: string): boolean {
  if (expr.type === 'CallExpression') {
    return isSpliceCallWithCounter(expr, counterName);
  }
  return (
    expr.type === 'AssignmentExpression' &&
    expr.right.type === 'CallExpression' &&
    isSpliceCallWithCounter(expr.right, counterName)
  );
}

/**
 * Checks if a CallExpression is a .splice() call whose first argument
 * is an Identifier matching the counter variable name.
 */
function isSpliceCallWithCounter(call: estree.CallExpression, counterName: string): boolean {
  return (
    call.callee.type === 'MemberExpression' &&
    call.callee.property.type === 'Identifier' &&
    call.callee.property.name === 'splice' &&
    call.arguments.length >= 1 &&
    call.arguments[0].type === 'Identifier' &&
    call.arguments[0].name === counterName
  );
}

function isUsedInsideBody(id: estree.Identifier, loopBody: estree.Node) {
  const bodyRange = loopBody.range;
  return id.range && bodyRange && id.range[0] > bodyRange[0] && id.range[1] < bodyRange[1];
}

function isInNestedForLoopUpdate(id: estree.Identifier, outerLoopBody: estree.Node): boolean {
  let node: estree.Node | undefined = id;
  let parent = getNodeParent(node);
  while (parent) {
    // Stop if we've reached the outer loop body
    if (parent === outerLoopBody) {
      return false;
    }
    // Check if we're in a nested for-loop's update clause
    if (parent.type === 'ForStatement' && parent.update) {
      const updateRange = parent.update.range;
      if (
        updateRange &&
        id.range &&
        id.range[0] >= updateRange[0] &&
        id.range[1] <= updateRange[1]
      ) {
        return true;
      }
    }
    node = parent;
    parent = getNodeParent(node);
  }
  return false;
}
