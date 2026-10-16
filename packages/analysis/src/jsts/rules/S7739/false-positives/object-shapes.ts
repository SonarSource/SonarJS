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
import type { Node } from 'estree';
import { isIdentifier } from '../../helpers/ast.js';
import { collectPropertyNames, getAncestorsWithParent } from '../helpers.js';

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
export function hasSiblingThenableMethods(node: Node): boolean {
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
export function isJsonSchemaConditional(node: Node): boolean {
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
export function isInterfaceShapeDescriptor(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const parent = ancestors[0];
  if (parent?.type !== 'Property') {
    return false;
  }
  return !parent.computed && parent.key === node && isIdentifier(parent.value, 'Function');
}
