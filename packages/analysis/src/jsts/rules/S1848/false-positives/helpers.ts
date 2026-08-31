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
 * Returns whether a variable is written exactly once in its entire lifetime
 * (e.g. a `const`, or a `let`/`var` that is never reassigned). Such a binding
 * has only one possible value once its write executes, so its value can be
 * trusted from a reader nested inside the write's function scope, as long as
 * the write also textually precedes the read.
 */
export function hasSingleWrite(variable: Scope.Variable): boolean {
  return variable.references.filter(reference => reference.isWrite()).length === 1;
}

/**
 * Returns whether `scope` is `ancestor` or is nested within it.
 */
export function isDescendantOrSameScope(scope: Scope.Scope, ancestor: Scope.Scope): boolean {
  let current: Scope.Scope | null = scope;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.upper;
  }
  return false;
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
