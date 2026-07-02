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
import { hasParent, isCallingMethod, isFunctionNode } from '../helpers/ast.js';
import { hasArrayElementDirectObjectOrigin, hasArrayReceiverOrigin } from './array.js';
import { hasDirectObjectOrigin } from './origin.js';

type InlineReduceCallbackParameterInfo = {
  parameterIndex: 0 | 1;
  reduceCall: InlineReduceCall;
  receiver: estree.Expression;
};

type InlineReduceCall = estree.CallExpression & {
  callee: estree.MemberExpression & { property: estree.Identifier };
};

/**
 * Returns information about a reduce callback parameter from that parameter's
 * `Scope.Definition`.
 *
 * `callbackParameterDefinition` must be the definition of the first or second
 * parameter of a callback passed directly to `.reduce(...)`, such as the
 * definitions of `acc` or `item` in
 * `array.reduce((acc, item) => ..., initialValue)`.
 *
 * The result identifies which callback parameter it is, the enclosing
 * `.reduce(...)` call, and the reduce receiver expression. Unsupported
 * definitions return `null`.
 */
function getReduceCallbackParameterInfoFromDefinition(
  callbackParameterDefinition: Scope.Definition,
): InlineReduceCallbackParameterInfo | null {
  if (
    callbackParameterDefinition.name.type !== 'Identifier' ||
    !isFunctionNode(callbackParameterDefinition.node)
  ) {
    return null;
  }

  const parameterIndex = callbackParameterDefinition.node.params.indexOf(
    callbackParameterDefinition.name,
  );
  if (parameterIndex !== 0 && parameterIndex !== 1) {
    return null;
  }

  const reduceCall = getEnclosingReduceCallForCallback(callbackParameterDefinition.node);
  if (!reduceCall || reduceCall.callee.object.type === 'Super') {
    return null;
  }

  return {
    parameterIndex,
    reduceCall,
    receiver: reduceCall.callee.object,
  };
}

/**
 * Returns `true` when `callbackParameterDefinition` is a supported inline
 * reduce callback parameter whose value can be proven to have direct-object
 * origin.
 *
 * The decision depends on which callback parameter definition is being
 * analyzed:
 * - parameter index `1`: the current array element
 * - parameter index `0`: the accumulator
 *
 * Supported cases:
 *
 * 1. The current-element parameter (index `1`), or the accumulator parameter
 *    (index `0`) of a seedless reduce whose accumulator starts as the first
 *    array element, when the reduce receiver can be proven to be an array whose
 *    elements all have direct-object origin:
 *
 *    `dates.reduce((lowest, current) => current < lowest ? current : lowest)`
 *
 * 2. The accumulator parameter (index `0`) of a seeded reduce, when the
 *    explicit reduce initial value has direct-object origin:
 *
 *    `values.reduce((lowest, current) => current < lowest ? current : lowest, new Date(0))`
 *
 * Unsupported cases return `false`, including non-inline callbacks, reduce
 * callbacks using other parameters, receivers that cannot be proven array-like,
 * or seeded accumulator parameters without a matching direct-object initial
 * value.
 */
export function hasReduceCallbackParameterDirectObjectOrigin(
  callbackParameterDefinition: Scope.Definition,
  sourceCode: SourceCode,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  // Only the first two parameters of an inline `reduce` callback are supported:
  // accumulator (index 0) and current element (index 1).
  const reduceParameter = getReduceCallbackParameterInfoFromDefinition(callbackParameterDefinition);
  if (!reduceParameter) {
    return false;
  }

  // We only trust the callback parameter when the reduce receiver itself can be
  // proven to be an array or array-like value.
  if (!hasArrayReceiverOrigin(reduceParameter.receiver, sourceCode, new Set())) {
    return false;
  }

  // The current-element parameter, and the accumulator of a seedless reduce
  // (which starts as the first array element), are safe only when every element
  // of the receiver can be traced to direct-object origin.
  const initialValue = reduceParameter.reduceCall.arguments[1];
  if (reduceParameter.parameterIndex === 1 || initialValue == null) {
    return hasArrayElementDirectObjectOrigin(
      reduceParameter.receiver,
      sourceCode,
      visitedVariables,
      new Set(),
    );
  }

  // The seeded accumulator parameter is safe only when the explicit initial
  // value can be traced to direct-object origin.
  return (
    initialValue.type !== 'SpreadElement' &&
    hasDirectObjectOrigin(initialValue, sourceCode, new Set(visitedVariables))
  );
}

function getEnclosingReduceCallForCallback(callback: estree.Function): InlineReduceCall | null {
  if (!hasParent(callback)) {
    return null;
  }

  const parent = callback.parent;
  if (
    parent.type === 'CallExpression' &&
    parent.arguments[0] === callback &&
    (isCallingMethod(parent, 1, 'reduce') || isCallingMethod(parent, 2, 'reduce'))
  ) {
    return parent;
  }

  return null;
}
