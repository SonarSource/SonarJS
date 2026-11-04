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
import type { Rule, SourceCode } from 'eslint';
import type { Node } from 'estree';
import { ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { findFirstMatchingAncestor, getNodeParent } from '../../helpers/ancestor.js';
import {
  isNumberLiteral,
  isTypeOnlyImportDeclaration,
  unwrapTypeScriptExpression,
} from '../../helpers/ast.js';
import { getImportDeclarations } from '../../helpers/module.js';

const GHERKIN_KEYWORDS = ['Feature', 'given', 'when', 'then'];
const GHERKIN_IMPORT_CACHE = new WeakMap<SourceCode, boolean>();

/**
 * Recognizes the `then` property in a Gherkin indentation map.
 *
 * `const indentation = { Feature: 0, given: 2, when: 2, then: 2 };`
 *
 * The reported node is `Property.key` in a const object initializer.
 * A runtime Gherkin import identifies the map. Later members must not
 * replace the selected `then` value. TypeScript type syntax does not change the map.
 */
export function isGherkinIndentationMap(context: Rule.RuleContext, node: Node): boolean {
  const property = getNumericThenProperty(node);
  if (!property) {
    return false;
  }

  const object = getDirectConstObjectInitializer(property);
  return (
    object != null &&
    hasGherkinImport(context) &&
    hasRequiredKeywordsWithoutLaterOverride(object, property)
  );
}

function getNumericThenProperty(node: Node): Extract<Node, { type: 'Property' }> | undefined {
  const property = getNodeParent(node);
  if (
    property?.type !== 'Property' ||
    property.key !== node ||
    property.kind !== 'init' ||
    !isNumberLiteral(unwrapTypeScriptExpression(property.value))
  ) {
    return undefined;
  }
  return property as Extract<Node, { type: 'Property' }>;
}

function getDirectConstObjectInitializer(
  property: Extract<Node, { type: 'Property' }>,
): Extract<Node, { type: 'ObjectExpression' }> | undefined {
  const object = getNodeParent(property);
  if (object?.type !== 'ObjectExpression') {
    return undefined;
  }

  const declarator = findFirstMatchingAncestor(
    object as TSESTree.Node,
    ancestor => ancestor.type === 'VariableDeclarator',
  );
  if (
    declarator?.type !== 'VariableDeclarator' ||
    !declarator.init ||
    unwrapTypeScriptExpression(declarator.init) !== object ||
    declarator.id.type !== 'Identifier' ||
    declarator.parent.type !== 'VariableDeclaration' ||
    declarator.parent.kind !== 'const'
  ) {
    return undefined;
  }
  return object;
}

function hasGherkinImport(context: Rule.RuleContext): boolean {
  const sourceCode = context.sourceCode;
  const cached = GHERKIN_IMPORT_CACHE.get(sourceCode);
  if (cached !== undefined) {
    return cached;
  }
  const hasGherkinImport = getImportDeclarations(context).some(
    declaration =>
      declaration.source.value === '@cucumber/gherkin' && !isTypeOnlyImportDeclaration(declaration),
  );
  GHERKIN_IMPORT_CACHE.set(sourceCode, hasGherkinImport);
  return hasGherkinImport;
}

function hasRequiredKeywordsWithoutLaterOverride(
  object: Extract<Node, { type: 'ObjectExpression' }>,
  property: Extract<Node, { type: 'Property' }>,
): boolean {
  const propertyIndex = object.properties.indexOf(property);
  const keys = new Set<string>();
  for (const [index, member] of object.properties.entries()) {
    const name = getNumericPropertyName(member, index, propertyIndex);
    if (name === null) {
      return false;
    }
    if (name !== undefined) {
      keys.add(name);
    }
  }
  return GHERKIN_KEYWORDS.every(keyword => keys.has(keyword));
}

function getNumericPropertyName(
  member: Extract<Node, { type: 'Property' }> | Extract<Node, { type: 'SpreadElement' }>,
  index: number,
  thenIndex: number,
): string | undefined | null {
  if (member.type !== 'Property') {
    return index <= thenIndex ? undefined : null;
  }
  const name = ASTUtils.getPropertyName(member as TSESTree.Property);
  if (name == null) {
    return index <= thenIndex ? undefined : null;
  }
  if (
    (index > thenIndex && name === 'then') ||
    !isNumberLiteral(unwrapTypeScriptExpression(member.value))
  ) {
    return null;
  }
  return name;
}
