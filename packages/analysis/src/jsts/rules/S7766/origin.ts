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

import type { Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { getUniqueWriteReference, isThisExpression } from '../helpers/ast.js';
import {
  everyDirectCallSiteArgumentMatches,
  matchesNodeOrIdentifierDefinition,
} from './helpers.js';
import { hasReduceCallbackParameterDirectObjectOrigin } from './reduce.js';

/**
 * Returns `true` when `node` can be traced to an accepted direct-object origin
 * for S7766's object fallback.
 *
 * Accepted origins are:
 * - `this`
 * - direct object expressions such as `new Date(...)`
 * - identifiers whose supported definitions resolve to one of those origins
 */
export function hasDirectObjectOrigin(
  node: estree.Node,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  return matchesNodeOrIdentifierDefinition(
    node,
    sourceCode,
    visitedVariables,
    candidate => isThisExpression(candidate) || isDirectObjectExpression(candidate),
    (definition, variable) =>
      hasDirectObjectDefinition(definition, variable, sourceCode, visitedVariables),
  );
}

function hasDirectObjectDefinition(
  definition: Scope.Definition,
  variable: Scope.Variable,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  switch (definition.type) {
    case 'Parameter':
      return (
        !variable.references.some(reference => reference.isWrite()) &&
        (hasReduceCallbackParameterDirectObjectOrigin(definition, sourceCode, visitedVariables) ||
          everyDirectCallSiteArgumentMatches(definition, sourceCode, isDirectObjectArgument))
      );
    case 'Variable': {
      const initializer = definition.node.init;
      return (
        initializer != null &&
        getUniqueWriteReference(variable) === initializer &&
        hasDirectObjectOrigin(initializer, sourceCode, visitedVariables)
      );
    }
    default:
      return false;
  }
}

/**
 * Checks whether an argument is a non-spread direct object expression.
 *
 * Spread arguments are rejected because they do not preserve the one-parameter
 * to one-argument proof that the fallback relies on.
 */
function isDirectObjectArgument(
  argument: estree.Expression | estree.SpreadElement | undefined,
): boolean {
  return (
    argument != null && argument.type !== 'SpreadElement' && isDirectObjectExpression(argument)
  );
}

/**
 * Matches the object expression shapes recognized by the fallback.
 *
 * Pseudo-code:
 *   new Date(...)
 *   { valueOf() { ... } }
 *   { valueOf: () => ... }
 *
 * The helper is intentionally narrow: only these two shapes count as direct
 * object origin.
 */
function isDirectObjectExpression(node: estree.Node): boolean {
  return isDateConstruction(node) || isObjectLiteralWithValueOf(node);
}

/**
 * Matches `new Date(...)`.
 *
 * Pseudo-code:
 *   new Date(123)
 */
function isDateConstruction(node: estree.Node): node is estree.NewExpression {
  return (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'Date'
  );
}

/**
 * Matches object literals that declare a `valueOf` property.
 *
 * Pseudo-code:
 *   { valueOf() { ... } }
 *   { valueOf: () => ... }
 *   { 'valueOf': fn }
 *
 * The check only looks for the property name; it does not validate the value.
 */
function isObjectLiteralWithValueOf(node: estree.Node): node is estree.ObjectExpression {
  return (
    node.type === 'ObjectExpression' &&
    node.properties.some(
      property =>
        property.type === 'Property' &&
        !property.computed &&
        ((property.key.type === 'Identifier' && property.key.name === 'valueOf') ||
          (property.key.type === 'Literal' && property.key.value === 'valueOf')),
    )
  );
}
