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
import { ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { findFirstMatchingAncestor, getNodeParent } from '../../helpers/ancestor.js';
import {
  isNumberLiteral,
  isTypeOnlyImportDeclaration,
  unwrapTypeScriptExpression,
} from '../../helpers/ast.js';
import { getImportDeclarations } from '../../helpers/module.js';

const GHERKIN_KEYWORDS = ['Feature', 'given', 'when', 'then'];

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
  const property = getNodeParent(node);
  if (
    property?.type !== 'Property' ||
    property.key !== node ||
    property.kind !== 'init' ||
    !isNumberLiteral(unwrapTypeScriptExpression(property.value))
  ) {
    return false;
  }

  const object = getNodeParent(property);
  if (object?.type !== 'ObjectExpression') {
    return false;
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
    return false;
  }

  const hasGherkinImport = getImportDeclarations(context).some(
    declaration =>
      declaration.source.value === '@cucumber/gherkin' && !isTypeOnlyImportDeclaration(declaration),
  );
  if (!hasGherkinImport) {
    return false;
  }

  const propertyIndex = object.properties.indexOf(property);
  const keys = new Set<string>();
  for (const [index, member] of object.properties.entries()) {
    if (member.type !== 'Property') {
      if (index > propertyIndex) {
        return false;
      }
      continue;
    }
    const name = ASTUtils.getPropertyName(member as TSESTree.Property);
    if (name == null) {
      if (index > propertyIndex) {
        return false;
      }
      continue;
    }
    if (index > propertyIndex && name === 'then') {
      return false;
    }
    if (!isNumberLiteral(unwrapTypeScriptExpression(member.value))) {
      return false;
    }
    keys.add(name);
  }
  return GHERKIN_KEYWORDS.every(keyword => keys.has(keyword));
}
