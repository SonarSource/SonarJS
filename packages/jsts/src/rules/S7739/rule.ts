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
// https://sonarsource.github.io/rspec/#/rspec/S7739/javascript

import type { Rule } from 'eslint';
import type { AssignmentExpression, CallExpression, MemberExpression, Node } from 'estree';
import { rules } from '../external/unicorn.js';
import {
  generateMeta,
  getFullyQualifiedName,
  interceptReport,
  isIdentifier,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const noThenable = rules['no-thenable'];

/**
 * Validation libraries like Yup and Joi intentionally define a `.then()` method
 * on their schema objects to allow chaining validations. This is a legitimate
 * use case that should not trigger the no-thenable rule.
 */
const EXCEPTION_LIBRARIES = ['yup', 'joi'];

/**
 * Checks if a node is inside a call expression from one of the exception libraries
 */
function isInsideExceptionLibraryCall(context: Rule.RuleContext, node: Node): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  for (const ancestor of ancestors) {
    if (ancestor.type === 'CallExpression') {
      const fqn = getFullyQualifiedName(context, ancestor as CallExpression);
      if (fqn && EXCEPTION_LIBRARIES.some(lib => fqn.startsWith(lib))) {
        return true;
      }
    }
  }

  return false;
}

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
function isDelegatingToPromiseThen(node: Node): boolean {
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

/**
 * Gets ancestors including the parent relationship for nodes.
 */
function getAncestorsWithParent(node: Node): Node[] {
  const ancestors: Node[] = [];
  let current = (node as Node & { parent?: Node }).parent;
  while (current) {
    ancestors.push(current);
    current = (current as Node & { parent?: Node }).parent;
  }
  return ancestors;
}

/**
 * Checks if 'then' is defined inside a class or function named 'Promise' or 'Deferred'.
 */
function isInsidePromiseOrDeferredDefinition(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);

  for (const ancestor of ancestors) {
    // Check for function declaration: function Promise() { } or function Deferred() { }
    if (
      ancestor.type === 'FunctionDeclaration' &&
      ancestor.id &&
      isIdentifier(ancestor.id, 'Promise', 'Deferred')
    ) {
      return true;
    }

    // Check for function expression or arrow function assigned to Promise or Deferred
    if (ancestor.type === 'FunctionExpression' || ancestor.type === 'ArrowFunctionExpression') {
      const funcParent = (ancestor as Node & { parent?: Node }).parent;
      // const Promise = function() { ... } or const Promise = () => { ... }
      if (
        funcParent?.type === 'VariableDeclarator' &&
        funcParent.id.type === 'Identifier' &&
        isIdentifier(funcParent.id, 'Promise', 'Deferred')
      ) {
        return true;
      }
      // Promise = function() { ... } or Promise = () => { ... }
      if (
        funcParent?.type === 'AssignmentExpression' &&
        funcParent.left.type === 'Identifier' &&
        isIdentifier(funcParent.left, 'Promise', 'Deferred')
      ) {
        return true;
      }
    }

    // Check for class declaration or class expression: class Promise { } or class Deferred { }
    if (
      (ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression') &&
      ancestor.id &&
      isIdentifier(ancestor.id, 'Promise', 'Deferred')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the assignment target is X.prototype.then (prototype extension pattern).
 * The reported node is the 'then' identifier, so we check:
 * - Parent is MemberExpression with object being X.prototype
 * - Grandparent is AssignmentExpression
 */
function isPrototypeThenAssignment(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  if (ancestors.length < 2) {
    return false;
  }

  const parent = ancestors[0]; // MemberExpression (Deferred.prototype.then)
  const grandparent = ancestors[1]; // AssignmentExpression

  // Check that we're in an assignment context
  if (grandparent?.type !== 'AssignmentExpression') {
    return false;
  }

  // Check that parent is a MemberExpression (the LHS of assignment)
  if (parent?.type !== 'MemberExpression') {
    return false;
  }

  const memberExpr = parent as MemberExpression;

  // Check if the reported node is the 'then' property
  if (!isIdentifier(node, 'then')) {
    return false;
  }

  // Check if object is X.prototype (where X is any identifier or member expression)
  if (
    memberExpr.object.type === 'MemberExpression' &&
    isIdentifier((memberExpr.object as MemberExpression).property, 'prototype')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the object containing 'then' also defines 'catch' or 'finally' methods,
 * indicating an intentional thenable implementation.
 */
function hasSiblingThenableMethods(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);

  // Find the containing object expression
  for (const ancestor of ancestors) {
    if (ancestor.type === 'ObjectExpression') {
      const propertyNames = new Set<string>();

      for (const prop of ancestor.properties) {
        if (prop.type === 'Property') {
          if (prop.key.type === 'Identifier') {
            propertyNames.add(prop.key.name);
          } else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
            propertyNames.add(prop.key.value);
          }
        }
      }

      // Check if object has both 'then' and ('catch' or 'finally')
      if (
        propertyNames.has('then') &&
        (propertyNames.has('catch') || propertyNames.has('finally'))
      ) {
        return true;
      }

      break; // Only check the immediate containing object
    }
  }

  return false;
}

/**
 * Checks if the reported node represents an intentional thenable implementation
 * that should not be flagged.
 */
function isIntentionalThenableImplementation(node: Node): boolean {
  return (
    isDelegatingToPromiseThen(node) ||
    isInsidePromiseOrDeferredDefinition(node) ||
    isPrototypeThenAssignment(node) ||
    hasSiblingThenableMethods(node)
  );
}

export const rule: Rule.RuleModule = interceptReport(
  {
    ...noThenable,
    meta: generateMeta(meta, noThenable.meta),
  },
  (context, descriptor) => {
    const node = (descriptor as { node?: Node }).node;
    if (!node) {
      context.report(descriptor);
      return;
    }

    // Skip reporting for code inside Yup/Joi calls
    if (isInsideExceptionLibraryCall(context, node)) {
      return;
    }

    // Skip reporting for intentional thenable implementations
    if (isIntentionalThenableImplementation(node)) {
      return;
    }

    context.report(descriptor);
  },
);
