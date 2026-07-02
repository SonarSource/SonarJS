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
import { getUniqueWriteReference } from '../helpers/ast.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { getTypeFromTreeNode, isArrayLikeType } from '../helpers/type.js';
import {
  everyDirectCallSiteArgumentMatches,
  matchesNodeOrIdentifierDefinition,
} from './helpers.js';
import { hasDirectObjectOrigin } from './origin.js';

/**
 * Returns `true` when `node` can be proven to be an array receiver, either
 * directly or through supported identifier definitions.
 *
 * Accepted receivers are array literals and values whose type resolves to an
 * array or array-like type.
 */
export function hasArrayReceiverOrigin(
  node: estree.Expression,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  return matchesNodeOrIdentifierDefinition(
    node,
    sourceCode,
    visitedVariables,
    candidate => matchesArrayReceiverBaseCase(candidate, sourceCode),
    (definition, variable) => matchesArrayDefinition(definition, variable, sourceCode, () => true),
  );
}

/**
 * Recognizes receivers that are provably array or array-like without tracing an
 * identifier: an array literal, or a value whose type resolves to an array.
 */
function matchesArrayReceiverBaseCase(node: estree.Node, sourceCode: SourceCode): boolean {
  if (node.type === 'ArrayExpression') {
    return true;
  }

  if (isRequiredParserServices(sourceCode.parserServices)) {
    const type = getTypeFromTreeNode(node, sourceCode.parserServices);
    return isArrayLikeType(type, sourceCode.parserServices);
  }

  return false;
}

/**
 * Traces a variable or parameter to an array literal, accepting it only when
 * `matchesArrayLiteral` also holds. Receiver matching passes `() => true`;
 * element matching additionally requires the literal to hold object elements.
 */
function matchesArrayDefinition(
  definition: Scope.Definition,
  variable: Scope.Variable,
  sourceCode: SourceCode,
  matchesArrayLiteral: (initializer: estree.ArrayExpression) => boolean,
): boolean {
  switch (definition.type) {
    case 'Variable': {
      const initializer = definition.node.init;
      return (
        initializer?.type === 'ArrayExpression' &&
        getUniqueWriteReference(variable) === initializer &&
        matchesArrayLiteral(initializer)
      );
    }
    case 'Parameter':
      return (
        !variable.references.some(reference => reference.isWrite()) &&
        everyDirectCallSiteArgumentMatches(
          definition,
          sourceCode,
          argument => argument?.type === 'ArrayExpression' && matchesArrayLiteral(argument),
        )
      );
    default:
      return false;
  }
}

/**
 * Returns `true` when `node` resolves to an array whose elements all have
 * direct-object origin.
 *
 * This is used for reduce element parameters and similar cases where the rule
 * needs to prove that iterated array values are direct objects.
 */
export function hasArrayElementDirectObjectOrigin(
  node: estree.Expression,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
  visitedArrayVariables: Set<Scope.Variable>,
): boolean {
  return matchesNodeOrIdentifierDefinition(
    node,
    sourceCode,
    visitedArrayVariables,
    candidate =>
      candidate.type === 'ArrayExpression' &&
      hasArrayLiteralObjectElements(candidate, sourceCode, visitedVariables),
    (definition, variable) =>
      matchesArrayDefinition(definition, variable, sourceCode, initializer =>
        hasArrayLiteralObjectElements(initializer, sourceCode, visitedVariables),
      ),
  );
}

function hasArrayLiteralObjectElements(
  node: estree.ArrayExpression,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  return (
    node.elements.length > 0 &&
    node.elements.every(
      element =>
        element != null &&
        element.type !== 'SpreadElement' &&
        hasDirectObjectOrigin(element, sourceCode, new Set(visitedVariables)),
    )
  );
}
