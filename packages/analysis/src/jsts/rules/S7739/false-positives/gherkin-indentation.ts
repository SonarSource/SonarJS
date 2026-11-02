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
import { getNodeParent } from '../../helpers/ancestor.js';
import { isNumberLiteral, isTypeOnlyImportDeclaration } from '../../helpers/ast.js';
import { getImportDeclarations } from '../../helpers/module.js';

const GHERKIN_KEYWORDS = ['Feature', 'given', 'when', 'then'];

export function isGherkinIndentationMap(context: Rule.RuleContext, node: Node): boolean {
  const property = getNodeParent(node);
  if (
    property?.type !== 'Property' ||
    property.key !== node ||
    property.kind !== 'init' ||
    !isNumberLiteral(property.value)
  ) {
    return false;
  }

  const object = getNodeParent(property);
  if (object?.type !== 'ObjectExpression') {
    return false;
  }

  const declarator = getNodeParent(object) as TSESTree.Node;
  if (
    declarator.type !== 'VariableDeclarator' ||
    declarator.init !== object ||
    declarator.id.type !== 'Identifier' ||
    !isNumericRecord(declarator.id.typeAnnotation?.typeAnnotation) ||
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
    if (member.type !== 'Property' || member.computed) {
      if (index > propertyIndex) {
        return false;
      }
      continue;
    }
    const name = ASTUtils.getPropertyName(member as TSESTree.Property);
    if (name == null || (index > propertyIndex && name === 'then')) {
      return false;
    }
    if (!isNumberLiteral(member.value)) {
      return false;
    }
    keys.add(name);
  }
  return GHERKIN_KEYWORDS.every(keyword => keys.has(keyword));
}

function isNumericRecord(type: TSESTree.TypeNode | undefined): boolean {
  if (
    type?.type !== 'TSTypeReference' ||
    type.typeName.type !== 'Identifier' ||
    type.typeName.name !== 'Readonly' ||
    type.typeArguments?.params.length !== 1
  ) {
    return false;
  }
  const record = type.typeArguments.params[0];
  return (
    record.type === 'TSTypeReference' &&
    record.typeName.type === 'Identifier' &&
    record.typeName.name === 'Record' &&
    record.typeArguments?.params.length === 2 &&
    record.typeArguments.params[0].type === 'TSStringKeyword' &&
    record.typeArguments.params[1].type === 'TSNumberKeyword'
  );
}
