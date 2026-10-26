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
import type { Rule } from 'eslint';
import type { AssignmentExpression, CallExpression, Node, Property } from 'estree';
import { isIdentifier, isStaticMethodCall, isThisExpression } from '../../helpers/ast.js';
import { getNodeParent } from '../../helpers/ancestor.js';
import { isGlobalShadowed } from '../../helpers/module.js';
import { collectPropertyNames, getAncestorsWithParent } from '../helpers.js';
import {
  isCallableThenValue,
  isConstFactoryResult,
  isDirectFactoryResult,
  isPromiseOrDeferredAssignmentTarget,
  isPromiseOrDeferredFunctionDeclaration,
} from './promise-factory.js';
import { isClassThenMethodWithThenableContract } from './thenable-contract.js';

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
 * Recognizes `const Promise = function () {}`, `Deferred = () => {}`, and their non-computed
 * member-assignment forms. Arrow functions that define `this.then` are excluded because their
 * lexical `this` does not belong to the factory.
 */
function isPromiseOrDeferredFunctionExpression(
  context: Rule.RuleContext,
  ancestor: Node,
  node: Node,
): boolean {
  if (ancestor.type !== 'FunctionExpression' && ancestor.type !== 'ArrowFunctionExpression') {
    return false;
  }
  if (
    ancestor.type === 'ArrowFunctionExpression' &&
    isArrowFunctionLexicalThisThenDefinition(context, node)
  ) {
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
    return isCallableThenDefinition(context, node);
  }
  // Promise = function() { ... } or ns.Deferred = () => { ... }
  return (
    funcParent.type === 'AssignmentExpression' &&
    isPromiseOrDeferredAssignmentTarget(funcParent.left) &&
    isCallableThenDefinition(context, node)
  );
}

/**
 * Recognizes an instance `then` implementation: `this.then = fn`,
 * `Object.defineProperty(this, 'then', { value: fn })`, an instance class member, or a
 * directly returned `{ then: fn }` factory object. Non-callable values and static members remain
 * reportable.
 */
function isCallableThenDefinition(context: Rule.RuleContext, node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const [parent, container] = ancestors;
  const assignment = ancestors.find(ancestor => ancestor.type === 'AssignmentExpression');
  if (
    parent?.type === 'CallExpression' &&
    parent.arguments[0] !== undefined &&
    isThisExpression(parent.arguments[0]) &&
    parent.arguments[1] === node &&
    parent.arguments[2] !== undefined &&
    isUnshadowedDefinePropertyCall(context, parent)
  ) {
    return isCallablePropertyDescriptor(parent.arguments[2] as Node);
  }
  if (
    parent?.type === 'MemberExpression' &&
    parent.property === node &&
    assignment?.type === 'AssignmentExpression'
  ) {
    return parent.object.type === 'ThisExpression' && isCallableThenValue(assignment.right);
  }
  if (parent?.type === 'Property' && parent.key === node) {
    return (
      parent.kind === 'init' &&
      container?.type === 'ObjectExpression' &&
      isDirectFactoryResult(container) &&
      isCallableThenValue(parent.value as Node)
    );
  }
  if (parent?.type === 'MethodDefinition' && parent.key === node) {
    return parent.kind === 'method' && !parent.static;
  }
  return (
    parent?.type === 'PropertyDefinition' &&
    parent.key === node &&
    !parent.static &&
    parent.value !== null &&
    parent.value !== undefined &&
    isCallableThenValue(parent.value)
  );
}

function isUnshadowedDefinePropertyCall(context: Rule.RuleContext, call: CallExpression): boolean {
  return (
    (isStaticMethodCall(call, 'Object', 'defineProperty') &&
      call.callee.type === 'MemberExpression' &&
      !isGlobalShadowed(context.sourceCode, call.callee.object, 'Object')) ||
    (isStaticMethodCall(call, 'Reflect', 'defineProperty') &&
      call.callee.type === 'MemberExpression' &&
      !isGlobalShadowed(context.sourceCode, call.callee.object, 'Reflect'))
  );
}

function isCallablePropertyDescriptor(node: Node): boolean {
  if (
    node.type !== 'ObjectExpression' ||
    node.properties.some(property => property.type === 'SpreadElement')
  ) {
    return false;
  }
  for (let index = node.properties.length - 1; index >= 0; index--) {
    const property = node.properties[index];
    if (
      property.type === 'Property' &&
      property.kind === 'init' &&
      isPropertyNamedValue(property)
    ) {
      return isCallableThenValue(property.value as Node);
    }
  }
  return false;
}

function isPropertyNamedValue(property: Property): boolean {
  return (
    (!property.computed && isIdentifier(property.key, 'value')) ||
    (property.key.type === 'Literal' && property.key.value === 'value')
  );
}

/**
 * Checks arrow code such as `exports.Promise = () => { this.then = fn; }` and
 * `Object.defineProperty(this, 'then', { value: fn })`, where `this` is lexical.
 */
function isArrowFunctionLexicalThisThenDefinition(context: Rule.RuleContext, node: Node): boolean {
  const [parent, assignment] = getAncestorsWithParent(node);
  if (
    parent?.type === 'CallExpression' &&
    parent.arguments[1] === node &&
    parent.arguments[0] !== undefined &&
    isThisExpression(parent.arguments[0]) &&
    parent.arguments[2] !== undefined &&
    isUnshadowedDefinePropertyCall(context, parent)
  ) {
    return true;
  }
  return isThisThenAssignment(parent, assignment, node) || isThisThenObjectUtilityProperty(node);
}

function isThisThenAssignment(parent: Node | undefined, assignment: Node | undefined, node: Node) {
  return (
    parent?.type === 'MemberExpression' &&
    parent.object.type === 'ThisExpression' &&
    parent.property === node &&
    assignment?.type === 'AssignmentExpression' &&
    assignment.left === parent
  );
}

/**
 * Recognizes `Object.assign(this, { then: fn })` and
 * `Object.defineProperties(this, { then: { value: fn } })` only while examining the object
 * literal's `then` property. Similar helper calls on another receiver remain reportable.
 */
function isThisThenObjectUtilityProperty(node: Node): boolean {
  const [property, object, call] = getAncestorsWithParent(node);
  return (
    property?.type === 'Property' &&
    property.key === node &&
    object?.type === 'ObjectExpression' &&
    call?.type === 'CallExpression' &&
    call.arguments[0]?.type === 'ThisExpression' &&
    (isStaticMethodCall(call, 'Object', 'assign') ||
      isStaticMethodCall(call, 'Object', 'defineProperties'))
  );
}

/**
 * Recognizes `class Promise { then() {} }` and `namespace.Deferred = class { then() {} }` as
 * instance factories. Static members are excluded because they make the class object thenable.
 */
function isPromiseOrDeferredClass(context: Rule.RuleContext, ancestor: Node, node: Node): boolean {
  if (ancestor.type !== 'ClassDeclaration' && ancestor.type !== 'ClassExpression') {
    return false;
  }
  if (isStaticClassMember(ancestor, node)) {
    return false;
  }
  if (ancestor.id !== null && isIdentifier(ancestor.id, 'Promise', 'Deferred')) {
    return isCallableThenDefinition(context, node);
  }
  const classParent = (ancestor as Node & { parent?: Node }).parent;
  return (
    classParent?.type === 'AssignmentExpression' &&
    isPromiseOrDeferredAssignmentTarget(classParent.left) &&
    isCallableThenDefinition(context, node)
  );
}

/**
 * Rejects `class Promise { static then() {} }` and static-block definitions: they make the class
 * object thenable, rather than implementing the instance-side Promise/Deferred factory pattern.
 */
function isStaticClassMember(classNode: Node, node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const classIndex = ancestors.indexOf(classNode);
  return ancestors
    .slice(0, classIndex)
    .some(
      ancestor =>
        ancestor.type === 'StaticBlock' ||
        ((ancestor.type === 'MethodDefinition' || ancestor.type === 'PropertyDefinition') &&
          ancestor.static),
    );
}

/**
 * Marks nested functions, classes, and ordinary object literals as a boundary between a named
 * Promise/Deferred factory and a `then` definition. Directly returned factory objects and arrows
 * that retain the factory's `this` are the deliberate exceptions.
 */
function isThenDefinitionBoundary(context: Rule.RuleContext, ancestor: Node, node: Node): boolean {
  if (ancestor.type === 'ObjectExpression') {
    return !isDirectFactoryResult(ancestor);
  }
  if (ancestor.type === 'FunctionExpression') {
    return getNodeParent(ancestor)?.type !== 'MethodDefinition';
  }
  if (ancestor.type === 'ArrowFunctionExpression') {
    return !isArrowFunctionLexicalThisThenDefinition(context, node);
  }
  return ['FunctionDeclaration', 'ClassDeclaration', 'ClassExpression'].includes(ancestor.type);
}

/**
 * Recognizes `then` defined directly by a `Promise`/`Deferred` class or factory, such as
 * `function Deferred() { this.then = fn }`. Nested declarations remain reportable unless they
 * are a direct factory result or preserve the enclosing receiver through an arrow function.
 */
function isInsidePromiseOrDeferredDefinition(context: Rule.RuleContext, node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  for (const ancestor of ancestors) {
    if (
      (isPromiseOrDeferredFunctionDeclaration(ancestor) &&
        isCallableThenDefinition(context, node)) ||
      isPromiseOrDeferredFunctionExpression(context, ancestor, node) ||
      isPromiseOrDeferredClass(context, ancestor, node)
    ) {
      return true;
    }
    if (isThenDefinitionBoundary(context, ancestor, node)) {
      return false;
    }
  }
  return false;
}

/**
 * Recognizes prototype extension such as `Deferred.prototype.then = fn`. It does not recognize
 * arbitrary `prototype.then` reads or non-assignment member expressions.
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
 * Checks if 'then' is a property key whose value is the Function constructor,
 * indicating an interface shape descriptor (e.g., { then: Function, open: Function }).
 * This pattern describes the expected shape of an object, not a thenable implementation.
 */
function isInterfaceShapeDescriptor(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const parent = ancestors[0];
  if (parent?.type !== 'Property') {
    return false;
  }
  return !parent.computed && parent.key === node && isIdentifier(parent.value, 'Function');
}

/**
 * Recognizes deliberate thenable shapes: delegation to another `.then`, a direct
 * Promise/Deferred factory definition, `Type.prototype.then = fn`, an object with `then` plus
 * `catch`/`finally`, JSON Schema `{ if, then }`, interface `{ then: Function }`, or a class that
 * explicitly implements a thenable contract. Other `then` properties remain reportable.
 */
export function isIntentionalThenableImplementation(
  context: Rule.RuleContext,
  node: Node,
): boolean {
  return (
    isDelegatingToPromiseThen(node) ||
    isInsidePromiseOrDeferredDefinition(context, node) ||
    isConstFactoryResult(context, node) ||
    isPrototypeThenAssignment(node) ||
    hasSiblingThenableMethods(node) ||
    isJsonSchemaConditional(node) ||
    isInterfaceShapeDescriptor(node) ||
    isClassThenMethodWithThenableContract(context, node)
  );
}
