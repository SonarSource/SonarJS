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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Node } from 'estree';
import { ancestorsChain } from '../helpers/ancestor.js';

const NO_BOUNDARY_TYPES = new Set<string>();

/**
 * Gets ancestors including the parent relationship for nodes, innermost-first.
 */
export function getAncestorsWithParent(node: Node): Node[] {
  return ancestorsChain(node as unknown as TSESTree.Node, NO_BOUNDARY_TYPES) as unknown as Node[];
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
export function collectPropertyNames(objectExpr: Node & { type: 'ObjectExpression' }): Set<string> {
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
