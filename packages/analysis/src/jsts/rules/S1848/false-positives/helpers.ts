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

import type { Scope } from 'eslint';
import type estree from 'estree';

/**
 * Returns the nearest enclosing function, module, or global scope.
 */
export function getNearestFunctionScope(scope: Scope.Scope): Scope.Scope {
  let current = scope;
  while (current.type !== 'function' && current.type !== 'module' && current.type !== 'global') {
    if (!current.upper) {
      return current;
    }
    current = current.upper;
  }
  return current;
}

/**
 * Returns a variable's sole write reference before a given identifier use.
 */
export function getUniqueWriteReferenceBefore(
  variable: Scope.Variable,
  node: estree.Identifier,
): Scope.Reference | undefined {
  const useStart = node.range?.[0];
  const writeReferences = variable.references.filter(reference => {
    const writeEnd = reference.identifier.range?.[1];
    return (
      reference.isWrite() &&
      writeEnd !== undefined &&
      useStart !== undefined &&
      writeEnd <= useStart
    );
  });
  return writeReferences.length === 1 ? writeReferences[0] : undefined;
}

/**
 * Unwraps TypeScript type assertions to get the underlying expression.
 * Handles TypeScript expression wrappers: TSAsExpression (`x as Type`),
 * TSTypeAssertion (`<Type>x`), and TSNonNullExpression (`x!`), as well as
 * ChainExpression (`x?.property`) produced by optional chaining; unwrapping it returns the
 * contained optional MemberExpression (`x?.property`), not its object (`x`).
 */
export function unwrapTypeAssertion(node: estree.Node): estree.Node {
  const nodeType = node.type as string;
  if (
    nodeType === 'TSAsExpression' ||
    nodeType === 'TSTypeAssertion' ||
    nodeType === 'TSNonNullExpression' ||
    nodeType === 'ChainExpression'
  ) {
    const expr = (node as unknown as { expression: estree.Node }).expression;
    return expr ? unwrapTypeAssertion(expr) : node;
  }
  return node;
}
