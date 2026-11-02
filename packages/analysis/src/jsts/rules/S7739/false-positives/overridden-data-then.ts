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
import type { Node, Property, SpreadElement } from 'estree';
import type { Rule } from 'eslint';
import { getPropertyName } from '@eslint-community/eslint-utils';
import { getNodeParent } from '../../helpers/ancestor.js';
import { isLiteral } from '../../helpers/ast.js';
import { getFullyQualifiedName } from '../../helpers/module.js';

export function hasPossiblyReplacedDataThen(context: Rule.RuleContext, node: Node): boolean {
  return hasDataThenOverride(context, node, () => false);
}

export function hasUnresolvedDataThenOverride(
  context: Rule.RuleContext,
  node: Node,
  isValidationLibraryFqn: (fqn: string) => boolean,
): boolean {
  return hasDataThenOverride(context, node, property =>
    isValidationThenProperty(context, property, isValidationLibraryFqn),
  );
}

function hasDataThenOverride(
  context: Rule.RuleContext,
  node: Node,
  isIntentionalThen: (property: Property) => boolean,
): boolean {
  const property = getNodeParent(node);
  if (property?.type !== 'Property' || property.key !== node) {
    return false;
  }
  const object = getNodeParent(property);
  if (object?.type !== 'ObjectExpression') {
    return false;
  }

  const state = { hasDataThen: false, finalThenMayBeCallable: false };
  for (const member of object.properties) {
    updateThenOverrideState(context, member, state, isIntentionalThen);
  }
  return state.hasDataThen && state.finalThenMayBeCallable;
}

function updateThenOverrideState(
  context: Rule.RuleContext,
  member: Property | SpreadElement,
  state: { hasDataThen: boolean; finalThenMayBeCallable: boolean },
  isIntentionalThen: (property: Property) => boolean,
): void {
  if (member.type === 'SpreadElement') {
    if (state.hasDataThen) {
      state.finalThenMayBeCallable = true;
    }
    return;
  }

  const name = getPropertyName(member, context.sourceCode.getScope(member));
  if (name !== 'then') {
    if (name == null && state.hasDataThen) {
      state.finalThenMayBeCallable = true;
    }
    return;
  }

  if (isNonCallableDataProperty(member)) {
    state.hasDataThen = true;
    state.finalThenMayBeCallable = false;
    return;
  }
  if (isIntentionalThen(member)) {
    state.hasDataThen = false;
    state.finalThenMayBeCallable = false;
    return;
  }
  if (state.hasDataThen) {
    state.finalThenMayBeCallable = true;
  }
}

function isValidationThenProperty(
  context: Rule.RuleContext,
  property: Property,
  isValidationLibraryFqn: (fqn: string) => boolean,
): boolean {
  if (property.kind !== 'init') {
    return false;
  }
  if (
    property.value.type === 'ArrowFunctionExpression' ||
    property.value.type === 'FunctionExpression'
  ) {
    return true;
  }
  if (property.value.type !== 'CallExpression') {
    return false;
  }
  const fqn = getFullyQualifiedName(context, property.value);
  return fqn != null && isValidationLibraryFqn(fqn);
}

function isNonCallableDataProperty(property: Property): boolean {
  return (
    property.kind === 'init' &&
    !property.method &&
    (isLiteral(property.value) ||
      property.value.type === 'ObjectExpression' ||
      property.value.type === 'ArrayExpression')
  );
}
