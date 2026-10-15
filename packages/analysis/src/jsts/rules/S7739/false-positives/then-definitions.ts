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
import type { CallExpression, Node, Property } from 'estree';
import { isIdentifier, isStaticMethodCall, isThisExpression } from '../../helpers/ast.js';
import { isGlobalShadowed } from '../../helpers/module.js';
import { getAncestorsWithParent } from '../helpers.js';

export function isUnshadowedDefinePropertyCall(
  context: Rule.RuleContext,
  call: CallExpression,
): boolean {
  return (
    (isStaticMethodCall(call, 'Object', 'defineProperty') &&
      call.callee.type === 'MemberExpression' &&
      !isGlobalShadowed(context.sourceCode, call.callee.object, 'Object')) ||
    (isStaticMethodCall(call, 'Reflect', 'defineProperty') &&
      call.callee.type === 'MemberExpression' &&
      !isGlobalShadowed(context.sourceCode, call.callee.object, 'Reflect'))
  );
}

export function isCallableThenValue(node: Node): boolean {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

export function isCallablePropertyDescriptor(node: Node): boolean {
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
export function isArrowFunctionLexicalThisThenDefinition(
  context: Rule.RuleContext,
  node: Node,
): boolean {
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
