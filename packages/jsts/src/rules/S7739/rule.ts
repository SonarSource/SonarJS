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
import type { AssignmentExpression, CallExpression, Node } from 'estree';
import { rules } from '../external/unicorn.js';
import {
  generateMeta,
  getFullyQualifiedName,
  interceptReport,
  isIdentifier,
} from '../helpers/index.js';
import { getDependenciesSanitizePaths } from '../helpers/package-jsons/dependencies.js';
import * as meta from './generated-meta.js';

const noThenable = rules['no-thenable'];

/**
 * Validation libraries like Yup and Joi intentionally define a `.then()` method
 * on their schema objects to allow chaining validations. This is a legitimate
 * use case that should not trigger the no-thenable rule.
 */
const EXCEPTION_LIBRARIES = ['yup', 'joi'];

/**
 * Checks if a node is inside a call expression from one of the exception libraries.
 * Uses two detection strategies:
 * 1. FQN check on ancestor CallExpressions (handles direct calls like yup.object({then: ...}))
 * 2. Conditional validation config pattern ({is, then}) when a validation library is a dependency
 */
function isInsideExceptionLibraryCall(context: Rule.RuleContext, node: Node): boolean {
  const dependencies = getDependenciesSanitizePaths(context);
  if (!EXCEPTION_LIBRARIES.some(lib => dependencies.has(lib))) {
    return false;
  }

  const ancestors = context.sourceCode.getAncestors(node);

  for (const ancestor of ancestors) {
    if (ancestor.type === 'CallExpression') {
      const fqn = getFullyQualifiedName(context, ancestor as CallExpression);
      if (fqn && EXCEPTION_LIBRARIES.some(lib => fqn.startsWith(lib))) {
        return true;
      }
    }
  }

  return isConditionalValidationConfig(node);
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
 * Checks if an ancestor is a function declaration named 'Promise' or 'Deferred'.
 */
function isPromiseOrDeferredFunctionDeclaration(ancestor: Node): boolean {
  return (
    ancestor.type === 'FunctionDeclaration' &&
    ancestor.id !== null &&
    isIdentifier(ancestor.id, 'Promise', 'Deferred')
  );
}

/**
 * Checks if an ancestor is a function expression/arrow assigned to 'Promise' or 'Deferred'.
 */
function isPromiseOrDeferredFunctionExpression(ancestor: Node): boolean {
  if (ancestor.type !== 'FunctionExpression' && ancestor.type !== 'ArrowFunctionExpression') {
    return false;
  }
  const funcParent = (ancestor as Node & { parent?: Node }).parent;
  if (!funcParent) {
    return false;
  }
  // const Promise = function() { ... } or const Promise = () => { ... }
  if (
    funcParent.type === 'VariableDeclarator' &&
    funcParent.id.type === 'Identifier' &&
    isIdentifier(funcParent.id, 'Promise', 'Deferred')
  ) {
    return true;
  }
  // Promise = function() { ... } or Promise = () => { ... }
  return (
    funcParent.type === 'AssignmentExpression' &&
    funcParent.left.type === 'Identifier' &&
    isIdentifier(funcParent.left, 'Promise', 'Deferred')
  );
}

/**
 * Checks if an ancestor is a class named 'Promise' or 'Deferred'.
 */
function isPromiseOrDeferredClass(ancestor: Node): boolean {
  return (
    (ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression') &&
    ancestor.id !== null &&
    isIdentifier(ancestor.id, 'Promise', 'Deferred')
  );
}

/**
 * Checks if 'then' is defined inside a class or function named 'Promise' or 'Deferred'.
 */
function isInsidePromiseOrDeferredDefinition(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  return ancestors.some(
    ancestor =>
      isPromiseOrDeferredFunctionDeclaration(ancestor) ||
      isPromiseOrDeferredFunctionExpression(ancestor) ||
      isPromiseOrDeferredClass(ancestor),
  );
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

  const [parent, grandparent] = ancestors; // parent: MemberExpression, grandparent: AssignmentExpression

  // Check that we're in an assignment context
  if (grandparent?.type !== 'AssignmentExpression') {
    return false;
  }

  // Check that parent is a MemberExpression (the LHS of assignment)
  if (parent?.type !== 'MemberExpression') {
    return false;
  }

  // Check if the reported node is the 'then' property
  if (!isIdentifier(node, 'then')) {
    return false;
  }

  // Check if object is X.prototype (where X is any identifier or member expression)
  const parentObject = parent.object;
  if (
    parentObject.type === 'MemberExpression' &&
    isIdentifier(parentObject.property, 'prototype')
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts the property name from a Property node's key.
 */
function getPropertyKeyName(prop: Node & { type: 'Property'; key: Node }): string | null {
  const { key } = prop;
  if (key.type === 'Identifier') {
    return key.name;
  }
  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }
  return null;
}

/**
 * Collects all property names from an ObjectExpression.
 */
function collectPropertyNames(objectExpr: Node & { type: 'ObjectExpression' }): Set<string> {
  const propertyNames = new Set<string>();
  for (const prop of objectExpr.properties) {
    if (prop.type === 'Property') {
      const name = getPropertyKeyName(prop);
      if (name !== null) {
        propertyNames.add(name);
      }
    }
  }
  return propertyNames;
}

/**
 * Checks if a set of property names indicates a thenable implementation.
 */
function hasCompleteThenable(propertyNames: Set<string>): boolean {
  return propertyNames.has('then') && (propertyNames.has('catch') || propertyNames.has('finally'));
}

/**
 * Checks if the object containing 'then' also defines 'catch' or 'finally' methods,
 * indicating an intentional thenable implementation.
 */
function hasSiblingThenableMethods(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const objectExpr = ancestors.find(a => a.type === 'ObjectExpression');
  if (objectExpr?.type !== 'ObjectExpression') {
    return false;
  }
  const propertyNames = collectPropertyNames(objectExpr);
  return hasCompleteThenable(propertyNames);
}

/**
 * Checks if 'then' is inside an object that also has an 'is' property,
 * indicating a conditional validation config pattern (e.g., {is: ..., then: ...}).
 * This pattern is used by validation libraries like Yup and Joi in their
 * .when() and .conditional() methods.
 */
function isConditionalValidationConfig(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const objectExpr = ancestors.find(a => a.type === 'ObjectExpression');
  if (objectExpr?.type !== 'ObjectExpression') {
    return false;
  }
  const propertyNames = collectPropertyNames(objectExpr);
  return propertyNames.has('then') && propertyNames.has('is');
}

/**
 * Checks if 'then' is inside an object that also has an 'if' sibling property,
 * indicating a JSON Schema conditional validation construct ({if, then, else}).
 */
function isJsonSchemaConditional(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const objectExpr = ancestors.find(a => a.type === 'ObjectExpression');
  if (objectExpr?.type !== 'ObjectExpression') {
    return false;
  }
  const propertyNames = collectPropertyNames(objectExpr);
  return propertyNames.has('then') && propertyNames.has('if');
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
    hasSiblingThenableMethods(node) ||
    isJsonSchemaConditional(node)
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
