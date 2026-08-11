/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S9163/javascript

import type { Rule, SourceCode } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type estree from 'estree';
import { childrenOf, getNodeParent, localAncestorsChain } from '../helpers/ancestor.js';
import {
  getVariableFromName,
  isIdentifier,
  isMemberExpression,
  isStringLiteral,
  resolveFunction,
} from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { getVueReactiveBindingKind } from '../helpers/vue.js';
import * as meta from './generated-meta.js';

const messages = {
  unconditionalMutation:
    "Don't unconditionally mutate reactive state in this hook; this can trigger an infinite update loop.",
};

const VUE_ON_UPDATED_FQN = 'vue.onUpdated';
const UPDATED_HOOK_NAME = 'updated';
const REF_VALUE_PROPERTY = 'value';
const FUNCTION_BOUNDARIES = new Set([
  'FunctionExpression',
  'ArrowFunctionExpression',
  'FunctionDeclaration',
]);
const GUARD_ANCESTOR_TYPES = new Set(['IfStatement', 'ConditionalExpression', 'LogicalExpression']);
const TERMINATING_STATEMENT_TYPES = new Set([
  'ReturnStatement',
  'ThrowStatement',
  'BreakStatement',
  'ContinueStatement',
]);

type Mutation = estree.AssignmentExpression | estree.UpdateExpression;

interface ReactiveMutationTarget {
  root: estree.Identifier;
  propertyName: string;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const hookFunctions = new Set<estree.Function>();

    function registerHook(candidate: estree.Node | null | undefined) {
      const hookFunction = resolveHookFunction(context, candidate);
      if (hookFunction) {
        hookFunctions.add(hookFunction);
      }
    }

    return {
      CallExpression(node: estree.CallExpression) {
        if (getFullyQualifiedName(context, node) === VUE_ON_UPDATED_FQN) {
          registerHook(node.arguments[0]);
        }
      },
      Property(node: estree.Property) {
        const isUpdatedKey =
          isIdentifier(node.key, UPDATED_HOOK_NAME) ||
          (isStringLiteral(node.key) && node.key.value === UPDATED_HOOK_NAME);
        if (isUpdatedKey && getNodeParent(node)?.type === 'ObjectExpression') {
          registerHook(node.value);
        }
      },
      'Program:exit'() {
        const visitorKeys = context.sourceCode.visitorKeys;
        for (const hookFunction of hookFunctions) {
          for (const mutation of collectMutations(hookFunction.body, visitorKeys)) {
            checkMutation(context, mutation, visitorKeys);
          }
        }
      },
    };
  },
};

/**
 * Resolves the function backing a hook registration: an inline arrow/function literal, or a named
 * function reference (function declaration, or a variable initialized with a function/arrow
 * expression) followed through scope. Anything else (member expressions, calls, ...) is left
 * unresolved rather than guessed at.
 */
function resolveHookFunction(
  context: Rule.RuleContext,
  node: estree.Node | null | undefined,
): estree.Function | undefined {
  if (!node) {
    return undefined;
  }
  const resolved = resolveFunction(context, node);
  if (resolved) {
    return resolved;
  }
  if (node.type === 'Identifier') {
    const variable = getVariableFromName(context, node.name, node);
    const definition = variable?.defs[0];
    if (definition?.type === 'Variable') {
      const init = (definition.node as estree.VariableDeclarator).init;
      if (init?.type === 'FunctionExpression' || init?.type === 'ArrowFunctionExpression') {
        return init;
      }
    }
  }
  return undefined;
}

/**
 * Collects every assignment/update expression directly inside `node`, stopping recursion at
 * nested function boundaries so mutations inside a function merely *called from* the hook (or any
 * other closure written inside it) are never collected in the first place.
 */
function collectMutations(node: estree.Node, visitorKeys: SourceCode.VisitorKeys): Mutation[] {
  const mutations: Mutation[] = [];
  visit(node);
  return mutations;

  function visit(current: estree.Node) {
    if (current.type === 'AssignmentExpression' || current.type === 'UpdateExpression') {
      mutations.push(current);
    }
    if (FUNCTION_BOUNDARIES.has(current.type)) {
      return;
    }
    for (const child of childrenOf(current, visitorKeys)) {
      visit(child);
    }
  }
}

function checkMutation(
  context: Rule.RuleContext,
  mutation: Mutation,
  visitorKeys: SourceCode.VisitorKeys,
) {
  const memberExpr = mutation.type === 'UpdateExpression' ? mutation.argument : mutation.left;
  const target = resolveMutationTarget(context, memberExpr);
  if (!target) {
    return;
  }
  if (isGuarded(mutation)) {
    return;
  }
  if (!hasRedFlagShape(mutation, target, visitorKeys)) {
    return;
  }
  context.report({ node: mutation, messageId: 'unconditionalMutation' });
}

/**
 * Recognizes `<ref>.value` and `<reactive>.<prop>` mutation targets (single property level only:
 * `state.a.b = ...` is an intentional false negative, see cb.fixture.vue).
 */
function resolveMutationTarget(
  context: Rule.RuleContext,
  node: estree.Node,
): ReactiveMutationTarget | undefined {
  if (node.type !== 'MemberExpression' || node.computed) {
    return undefined;
  }
  const { object, property } = node;
  if (object.type !== 'Identifier' || property.type !== 'Identifier') {
    return undefined;
  }
  const kind = getVueReactiveBindingKind(context, object);
  if (kind === 'ref' && property.name === REF_VALUE_PROPERTY) {
    return { root: object, propertyName: REF_VALUE_PROPERTY };
  }
  if (kind === 'reactive') {
    return { root: object, propertyName: property.name };
  }
  return undefined;
}

/**
 * Signal 1: a mutation nested inside an `if`/ternary/logical guard, or reached only after an
 * early-return guard clause earlier in the same block, is never flagged - proving that a guard
 * actually converges is undecidable in general, so guard presence alone is a hard exemption.
 */
function isGuarded(mutation: Mutation): boolean {
  const node = mutation as unknown as TSESTree.Node;
  if (hasGuardingAncestor(node)) {
    return true;
  }
  return isReachedThroughEarlyReturnGuard(node);
}

/**
 * Walks up the local ancestor chain looking for a guard whose conditionally-executed branch
 * actually contains the mutation. Ancestors are only exempting if the child leading to `node` sits
 * in a branch that doesn't always execute; e.g. an `IfStatement`'s `test`, a `ConditionalExpression`'s
 * `test`, or a `LogicalExpression`'s left operand always run regardless of the guard's outcome, so
 * they don't count as guarding positions.
 */
function hasGuardingAncestor(node: TSESTree.Node): boolean {
  let childBelow: TSESTree.Node = node;
  for (const ancestor of localAncestorsChain(node)) {
    if (GUARD_ANCESTOR_TYPES.has(ancestor.type) && !isAlwaysExecutedChild(ancestor, childBelow)) {
      return true;
    }
    childBelow = ancestor;
  }
  return false;
}

function isAlwaysExecutedChild(ancestor: TSESTree.Node, child: TSESTree.Node): boolean {
  if (ancestor.type === 'IfStatement' || ancestor.type === 'ConditionalExpression') {
    return ancestor.test === (child as unknown as TSESTree.Expression);
  }
  if (ancestor.type === 'LogicalExpression') {
    return ancestor.left === (child as unknown as TSESTree.Expression);
  }
  return false;
}

function isReachedThroughEarlyReturnGuard(node: TSESTree.Node): boolean {
  let childBelow: TSESTree.Node = node;
  for (const ancestor of localAncestorsChain(node)) {
    if (ancestor.type === 'BlockStatement') {
      const index = ancestor.body.indexOf(childBelow as TSESTree.Statement);
      if (index > 0 && ancestor.body.slice(0, index).some(isGuardClause)) {
        return true;
      }
    }
    childBelow = ancestor;
  }
  return false;
}

function isGuardClause(statement: TSESTree.Statement): boolean {
  return (
    statement.type === 'IfStatement' &&
    !statement.alternate &&
    terminatesControlFlow(statement.consequent)
  );
}

function terminatesControlFlow(statement: TSESTree.Statement): boolean {
  if (TERMINATING_STATEMENT_TYPES.has(statement.type)) {
    return true;
  }
  if (statement.type === 'BlockStatement' && statement.body.length > 0) {
    const lastStatement = statement.body.at(-1);
    return lastStatement ? terminatesControlFlow(lastStatement) : false;
  }
  return false;
}

/**
 * Signal 2: flags shapes that are guaranteed to differ across repeated invocations - `++`/`--`, a
 * compound assignment, a self-reference to the same binding being mutated, or a call to a known
 * non-deterministic builtin. A plain assignment of a literal or otherwise-stable value (`count.value
 * = 3`) converges after one call (Vue's ref/reactive setters bail out via Object.is) and is left
 * unflagged.
 */
function hasRedFlagShape(
  mutation: Mutation,
  target: ReactiveMutationTarget,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  if (mutation.type === 'UpdateExpression') {
    return true;
  }
  if (mutation.operator !== '=') {
    return true;
  }
  return containsRedFlag(mutation.right, target, visitorKeys);
}

function containsRedFlag(
  node: estree.Node,
  target: ReactiveMutationTarget,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  if (node.type === 'UpdateExpression') {
    return true;
  }
  if (node.type === 'AssignmentExpression' && node.operator !== '=') {
    return true;
  }
  if (node.type === 'MemberExpression' && isSameTarget(node, target)) {
    return true;
  }
  if (
    node.type === 'CallExpression' &&
    (isMemberExpression(node.callee as estree.Node, 'Date', 'now') ||
      isMemberExpression(node.callee as estree.Node, 'Math', 'random') ||
      isMemberExpression(node.callee as estree.Node, 'performance', 'now'))
  ) {
    return true;
  }
  if (FUNCTION_BOUNDARIES.has(node.type)) {
    return false;
  }
  return childrenOf(node, visitorKeys).some(child => containsRedFlag(child, target, visitorKeys));
}

function isSameTarget(
  memberExpr: estree.MemberExpression,
  target: ReactiveMutationTarget,
): boolean {
  return (
    !memberExpr.computed &&
    memberExpr.object.type === 'Identifier' &&
    memberExpr.object.name === target.root.name &&
    memberExpr.property.type === 'Identifier' &&
    memberExpr.property.name === target.propertyName
  );
}
