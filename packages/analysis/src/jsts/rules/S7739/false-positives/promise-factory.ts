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
import type { Node } from 'estree';
import { getVariableFromName, isIdentifier } from '../../helpers/ast.js';
import { getNodeParent } from '../../helpers/ancestor.js';
import { getAncestorsWithParent } from '../helpers.js';

/**
 * Checks if an ancestor is a function declaration named 'Promise' or 'Deferred'.
 */
export function isPromiseOrDeferredFunctionDeclaration(ancestor: Node): boolean {
  return (
    ancestor.type === 'FunctionDeclaration' &&
    ancestor.id !== null &&
    isIdentifier(ancestor.id, 'Promise', 'Deferred')
  );
}

/**
 * Recognizes a factory assignment such as `Promise = ...` or `namespace.Deferred = ...`.
 * Computed targets, such as `namespace['Promise']`, intentionally remain outside this pattern.
 */
export function isPromiseOrDeferredAssignmentTarget(target: Node): boolean {
  return (
    isIdentifier(target, 'Promise', 'Deferred') || isPromiseOrDeferredMemberAssignmentTarget(target)
  );
}

function isPromiseOrDeferredMemberAssignmentTarget(target: Node): boolean {
  return (
    target.type === 'MemberExpression' &&
    !target.computed &&
    isIdentifier(target.property, 'Promise', 'Deferred')
  );
}

export function isCallableThenValue(node: Node): boolean {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

/**
 * Recognizes `{ then: fn }` only when it is the direct return value of a named Promise/Deferred
 * factory or method. A nested object literal does not establish that its `then` belongs to the
 * factory result and remains reportable.
 */
export function isDirectFactoryResult(node: Node): boolean {
  const parent = getNodeParent(node);
  if (
    (parent?.type === 'ArrowFunctionExpression' ||
      parent?.type === 'FunctionExpression' ||
      parent?.type === 'FunctionDeclaration') &&
    parent.body === node
  ) {
    return isPromiseOrDeferredFactory(parent);
  }
  const block = parent?.type === 'ReturnStatement' ? getNodeParent(parent) : undefined;
  const functionNode = block?.type === 'BlockStatement' ? getNodeParent(block) : undefined;
  return (
    (functionNode?.type === 'ArrowFunctionExpression' ||
      functionNode?.type === 'FunctionExpression' ||
      functionNode?.type === 'FunctionDeclaration') &&
    isPromiseOrDeferredFactory(functionNode) &&
    functionNode.body === block &&
    block?.type === 'BlockStatement' &&
    parent?.type === 'ReturnStatement' &&
    block.body.includes(parent)
  );
}

/**
 * Recognizes an object literal saved in a local const and returned from the same Promise/Deferred
 * factory. The binding identity prevents an outer or shadowed variable from being treated as the
 * factory result.
 */
export function isConstFactoryResult(context: Rule.RuleContext, node: Node): boolean {
  const [property, object, declarator, declaration] = getAncestorsWithParent(node);
  if (
    property?.type !== 'Property' ||
    property.key !== node ||
    property.kind !== 'init' ||
    !isCallableThenValue(property.value as Node) ||
    object?.type !== 'ObjectExpression' ||
    declarator?.type !== 'VariableDeclarator' ||
    declarator.init !== object ||
    declarator.id.type !== 'Identifier' ||
    declaration?.type !== 'VariableDeclaration' ||
    declaration.kind !== 'const'
  ) {
    return false;
  }

  const variable = getVariableFromName(context, declarator.id.name, declarator.id);
  if (
    variable?.defs.length !== 1 ||
    variable.defs[0].type !== 'Variable' ||
    variable.defs[0].node !== declarator ||
    variable.references.filter(reference => reference.isWrite()).length !== 1
  ) {
    return false;
  }

  const factory = getAncestorsWithParent(declarator).find(
    ancestor =>
      ancestor.type === 'FunctionDeclaration' ||
      ancestor.type === 'FunctionExpression' ||
      ancestor.type === 'ArrowFunctionExpression',
  );
  if (!factory || !isPromiseOrDeferredFactory(factory)) {
    return false;
  }

  return variable.references.some(reference => {
    if (reference.isWrite()) {
      return false;
    }
    const parent = getNodeParent(reference.identifier);
    if (parent?.type !== 'ReturnStatement' || parent.argument !== reference.identifier) {
      return false;
    }
    const returnFactory = getAncestorsWithParent(parent).find(
      ancestor =>
        ancestor.type === 'FunctionDeclaration' ||
        ancestor.type === 'FunctionExpression' ||
        ancestor.type === 'ArrowFunctionExpression',
    );
    return returnFactory === factory;
  });
}

/**
 * Recognizes function, arrow, and instance-method factories named or assigned `Promise` or
 * `Deferred`, for example `exports.Promise = () => ({ then() {} })`.
 */
function isPromiseOrDeferredFactory(node: Node): boolean {
  if (isPromiseOrDeferredFunctionDeclaration(node)) {
    return true;
  }
  if (isNamedPromiseOrDeferredClassMethod(node)) {
    return true;
  }
  if (node.type !== 'FunctionExpression' && node.type !== 'ArrowFunctionExpression') {
    return false;
  }
  const parent = getNodeParent(node);
  return (
    (parent?.type === 'VariableDeclarator' &&
      parent.id.type === 'Identifier' &&
      isIdentifier(parent.id, 'Promise', 'Deferred')) ||
    (parent?.type === 'AssignmentExpression' && isPromiseOrDeferredAssignmentTarget(parent.left))
  );
}

/**
 * Recognizes an instance method of `class Promise` or `class Deferred` returning a factory
 * object. Static methods are excluded because their returned object is not tied to an instance
 * factory.
 */
function isNamedPromiseOrDeferredClassMethod(node: Node): boolean {
  if (node.type !== 'FunctionExpression') {
    return false;
  }
  const method = getNodeParent(node);
  if (method?.type !== 'MethodDefinition' || method.static || method.kind !== 'method') {
    return false;
  }
  const classBody = getNodeParent(method);
  const classNode = classBody?.type === 'ClassBody' ? getNodeParent(classBody) : undefined;
  return (
    (classNode?.type === 'ClassDeclaration' || classNode?.type === 'ClassExpression') &&
    classNode.id !== null &&
    isIdentifier(classNode.id, 'Promise', 'Deferred')
  );
}
