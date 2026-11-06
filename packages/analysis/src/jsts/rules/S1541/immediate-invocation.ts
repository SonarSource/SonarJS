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
import type estree from 'estree';
import { unwrapTypeScriptValue } from './helpers.js';

/**
 * Return a function literal that runs as a call target or template tag.
 *
 * `(function () {})()` and `(0, () => {})()` return their function.
 * `(function* () {})()` and `(function () {}).call()` do not.
 * The `.call` method can be replaced, so calling it might not run the function body.
 */
export function getImmediatelyInvokedFunction(
  expression: estree.Node,
): estree.FunctionExpression | estree.ArrowFunctionExpression | undefined {
  const value = getFinalValue(expression);
  return (value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression') &&
    !value.generator
    ? value
    : undefined;
}

/**
 * Return a synchronous constructor function literal.
 *
 * `new (function () {})()` returns its function. An async function and an arrow do not.
 */
export function getImmediatelyConstructedFunction(
  expression: estree.Node,
): estree.FunctionExpression | undefined {
  const value = getFinalValue(expression);
  return value.type === 'FunctionExpression' && !value.async && !value.generator
    ? value
    : undefined;
}

function getFinalValue(expression: estree.Node): estree.Node {
  const value = unwrapTypeScriptValue(expression);
  if (value.type !== 'SequenceExpression') {
    return value;
  }
  const lastExpression = value.expressions.at(-1);
  return lastExpression ? getFinalValue(lastExpression) : value;
}
