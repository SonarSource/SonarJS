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
import type { Rule, Scope } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { unwrapTypeScriptExpression } from '../helpers/ast.js';

const MAX_MODULE_FACTORY_ARGUMENTS = 3;

/**
 * `(factory as Function)` -> `factory`
 * `factory<number>` -> `factory`
 */
export function unwrapTypeScriptValue(expression: estree.Node): estree.Node {
  const value = unwrapTypeScriptExpression(expression);
  const tsValue = value as unknown as TSESTree.Node;
  return tsValue.type === 'TSInstantiationExpression'
    ? unwrapTypeScriptValue(tsValue.expression as unknown as estree.Node)
    : value;
}

/**
 * Get the property path of an expression rooted at `define`, `sap`, `require`, or `System`.
 *
 * `sap.ui.define` -> ['sap', 'ui', 'define']
 * `other.ui.define` -> undefined
 * `sap.ui['define']` -> ['sap', 'ui', 'define'] when `allowComputed` is true
 * `sap.ui[42]` -> ['sap', 'ui', '42'] when `allowComputed` is true
 * sap.ui[`unrelated`] -> ['sap', 'ui', 'unrelated'] when `allowComputed` is true
 * `sap.ui[key]` -> ['sap', 'ui', '*'] when `allowComputed` is true
 * `sap.ui[key]` -> undefined when `allowComputed` is false
 *
 * A `'*'` segment can match any property when the rule checks writes.
 */
export function getPropertyAccessPath(
  expression: estree.Node,
  allowComputed: boolean,
): string[] | undefined {
  const node = allowComputed ? unwrapTypeScriptValue(expression) : expression;
  if (allowComputed && node.type === 'ChainExpression') {
    return getPropertyAccessPath(node.expression, allowComputed);
  }
  if (node.type === 'Identifier') {
    return ['define', 'sap', 'require', 'System'].includes(node.name) ? [node.name] : undefined;
  }
  if (node.type !== 'MemberExpression' || (!allowComputed && (node.computed || node.optional))) {
    return undefined;
  }
  const object = getPropertyAccessPath(node.object, allowComputed);
  if (!object) {
    return undefined;
  }
  if (!node.computed && node.property.type === 'Identifier') {
    return [...object, node.property.name];
  }
  return [...object, getStaticPropertyName(node.property) ?? '*'];
}

/**
 * `obj['name']` -> 'name'
 * `obj[42]` -> '42'
 * obj[`name`] -> 'name'
 * `obj[key]` -> undefined
 */
function getStaticPropertyName(property: estree.Node): string | undefined {
  const value = unwrapTypeScriptValue(property);
  if (
    value.type === 'Literal' &&
    (typeof value.value === 'string' || typeof value.value === 'number')
  ) {
    return String(value.value);
  }
  if (value.type === 'TemplateLiteral' && value.expressions.length === 0) {
    return value.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

/**
 * Match an unshadowed bare `define` call with an AMD signature.
 *
 * `define([], function () {})` -> the function node
 */
export function getModuleFactory(
  call: estree.CallExpression,
  context: Rule.RuleContext,
): estree.FunctionExpression | undefined {
  if (
    call.callee.type !== 'Identifier' ||
    call.callee.name !== 'define' ||
    call.arguments.length < 1 ||
    call.arguments.length > MAX_MODULE_FACTORY_ARGUMENTS
  ) {
    return undefined;
  }
  const args = call.arguments.map(unwrapTypeScriptValue);
  const factory = args.pop();
  if (factory?.type !== 'FunctionExpression' || factory.generator) {
    return undefined;
  }
  if (isStringLiteral(args[0])) {
    args.shift();
  }
  if (args.length === 1 && args[0].type === 'ArrayExpression') {
    if (!args[0].elements.every(isStringLiteral)) {
      return undefined;
    }
    args.pop();
  }
  return args.length === 0 && !hasRuntimeBinding(context, call, 'define') ? factory : undefined;
}

/** Type-only declarations do not shadow a runtime value. */
export function hasRuntimeBinding(
  context: Rule.RuleContext,
  node: estree.Node,
  name: string,
): boolean {
  return (getRuntimeVariable(context, node, name)?.defs.length ?? 0) > 0;
}

/** Type-only definitions do not bind a name at runtime. */
function hasOnlyTypeDefinitions(variable: Scope.Variable): boolean {
  return (
    variable.defs.length > 0 &&
    variable.defs.every(def => {
      const type = (def.node as TSESTree.Node).type;
      return type === 'TSTypeAliasDeclaration' || type === 'TSInterfaceDeclaration';
    })
  );
}

function getRuntimeVariable(
  context: Rule.RuleContext,
  node: estree.Node,
  name: string,
): Scope.Variable | undefined {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(name);
    if (variable && !hasOnlyTypeDefinitions(variable)) {
      return variable;
    }
    scope = scope.upper;
  }
  return undefined;
}

/**
 * `'dep'` -> true
 * `dep` -> false
 * `` `dep` `` -> false
 */
export function isStringLiteral(node: estree.Node | null | undefined): boolean {
  const value = node && unwrapTypeScriptValue(node);
  return value?.type === 'Literal' && typeof value.value === 'string';
}
