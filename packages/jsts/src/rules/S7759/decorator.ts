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
// https://sonarsource.github.io/rspec/#/rspec/S7759/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, interceptReport, isMemberExpression } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the unicorn/prefer-date-now rule to filter out reports where
 * `new Date().getTime()`, `+(new Date())`, or similar patterns are used
 * inside a polyfill fallback that checks for `Date.now` availability.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      const node = (descriptor as { node?: estree.Node }).node;
      if (!node) {
        context.report(descriptor);
        return;
      }

      // Check if the node is inside a polyfill pattern
      if (isInsidePolyfillPattern(node, context)) {
        return; // Suppress the report
      }

      context.report(descriptor);
    },
  );
}

/**
 * Checks if the flagged node is inside a Date.now polyfill pattern.
 */
function isInsidePolyfillPattern(node: estree.Node, context: Rule.RuleContext): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  for (const ancestor of ancestors) {
    // Pattern 1: Date.now || function() { return new Date().getTime(); }
    if (isLogicalOrPolyfill(node, ancestor, ancestors)) {
      return true;
    }

    // Pattern 2: Date.now ? Date.now() : +(new Date())
    if (isTernaryPolyfill(node, ancestor, ancestors)) {
      return true;
    }

    // Pattern 3: if (!Date.now) { Date.now = function() { ... }; }
    if (isIfStatementPolyfill(node, ancestor, ancestors)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks for LogicalExpression pattern: Date.now || fallback
 * The flagged node should be in the right (fallback) branch.
 */
function isLogicalOrPolyfill(
  node: estree.Node,
  ancestor: estree.Node,
  ancestors: estree.Node[],
): boolean {
  if (ancestor.type !== 'LogicalExpression' || ancestor.operator !== '||') {
    return false;
  }

  // Check if left operand is Date.now
  if (!isDateNow(ancestor.left)) {
    return false;
  }

  // Check if flagged node is in the right operand (fallback branch)
  return isDescendantOf(node, ancestor.right, ancestors);
}

/**
 * Checks for ConditionalExpression pattern: Date.now ? Date.now() : fallback
 * The flagged node should be in the alternate (fallback) branch.
 */
function isTernaryPolyfill(
  node: estree.Node,
  ancestor: estree.Node,
  ancestors: estree.Node[],
): boolean {
  if (ancestor.type !== 'ConditionalExpression') {
    return false;
  }

  // Check if test references Date.now (truthy check)
  if (!isDateNow(ancestor.test)) {
    return false;
  }

  // Check if flagged node is in the alternate (fallback) branch
  return isDescendantOf(node, ancestor.alternate, ancestors);
}

/**
 * Checks for IfStatement pattern: if (!Date.now) { Date.now = ...; }
 * The flagged node should be inside the consequent block that assigns to Date.now.
 */
function isIfStatementPolyfill(
  node: estree.Node,
  ancestor: estree.Node,
  ancestors: estree.Node[],
): boolean {
  if (ancestor.type !== 'IfStatement') {
    return false;
  }

  // Check if test is !Date.now
  const { test } = ancestor;
  if (test.type !== 'UnaryExpression' || test.operator !== '!') {
    return false;
  }

  if (!isDateNow(test.argument)) {
    return false;
  }

  // Check if consequent contains an assignment to Date.now
  if (!containsDateNowAssignment(ancestor.consequent)) {
    return false;
  }

  // Check if flagged node is in the consequent (not in the alternate/else branch)
  return isDescendantOf(node, ancestor.consequent, ancestors);
}

/**
 * Checks if a node is the `Date.now` member expression.
 */
function isDateNow(node: estree.Node): boolean {
  return isMemberExpression(node, 'Date', 'now');
}

/**
 * Checks if a node or its descendants contain an assignment to Date.now.
 */
function containsDateNowAssignment(node: estree.Node): boolean {
  if (node.type === 'ExpressionStatement') {
    return containsDateNowAssignment(node.expression);
  }

  if (node.type === 'AssignmentExpression') {
    return isDateNow(node.left);
  }

  if (node.type === 'BlockStatement') {
    return node.body.some(stmt => containsDateNowAssignment(stmt));
  }

  return false;
}

/**
 * Checks if `node` is a descendant of `potentialAncestor` using the ancestors array.
 */
function isDescendantOf(
  node: estree.Node,
  potentialAncestor: estree.Node,
  ancestors: estree.Node[],
): boolean {
  // If node is exactly potentialAncestor, it's a descendant (trivially)
  if (node === potentialAncestor) {
    return true;
  }

  // Walk up from node through ancestors to see if we pass through potentialAncestor
  for (const anc of ancestors) {
    if (anc === potentialAncestor) {
      return true;
    }
  }

  return false;
}
