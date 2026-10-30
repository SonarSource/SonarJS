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
import type { AssignmentExpression, CallExpression, Node } from 'estree';
import { isIdentifier } from '../../helpers/ast.js';
import { getAncestorsWithParent } from '../helpers.js';

/**
 * Checks if the RHS of an assignment delegates to a Promise's then method.
 * Covers patterns like:
 * - result.then = promise.then.bind(promise)
 * - result.then = readyList.then
 * - result.then = (arg1, arg2) => promise.then(arg1, arg2)
 *
 * The reported node is the 'then' identifier, so we need to find the
 * AssignmentExpression in the ancestor chain (grandparent for MemberExpression case).
 */
export function isDelegatingToPromiseThen(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);

  // Find the AssignmentExpression ancestor
  const assignmentIndex = ancestors.findIndex(a => a.type === 'AssignmentExpression');
  if (assignmentIndex === -1) {
    return false;
  }

  const assignment = ancestors[assignmentIndex] as AssignmentExpression;
  const rhs = assignment.right;

  // Check for X.then pattern
  if (isMemberAccessingThen(rhs)) {
    return true;
  }

  // Check for X.then.bind(...) pattern
  if (
    rhs.type === 'CallExpression' &&
    rhs.callee.type === 'MemberExpression' &&
    !rhs.callee.computed &&
    isIdentifier(rhs.callee.property, 'bind') &&
    isMemberAccessingThen(rhs.callee.object)
  ) {
    return true;
  }

  // Check for arrow function delegating to X.then(): (args) => promise.then(args)
  if (isArrowFunctionDelegatingToThen(rhs)) {
    return true;
  }

  return false;
}

/**
 * Checks if a node is an arrow function whose body calls X.then().
 * Covers patterns like: (arg1, arg2) => promise.then(arg1, arg2)
 */
function isArrowFunctionDelegatingToThen(node: Node): boolean {
  if (node.type !== 'ArrowFunctionExpression') {
    return false;
  }

  const body = node.body;

  // Check for concise body: (args) => promise.then(args)
  if (body.type === 'CallExpression' && isCallToThenMethod(body)) {
    return true;
  }

  return false;
}

/**
 * Checks if a CallExpression is calling a .then() method on some object.
 */
function isCallToThenMethod(call: CallExpression): boolean {
  return (
    call.callee.type === 'MemberExpression' &&
    !call.callee.computed &&
    isIdentifier(call.callee.property, 'then')
  );
}

/**
 * Checks if a node is a member expression accessing a 'then' property via dot notation.
 */
function isMemberAccessingThen(node: Node): boolean {
  return node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, 'then');
}
