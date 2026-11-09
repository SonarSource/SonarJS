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
import { isFunctionNode } from '../helpers/ast.js';
import {
  getModuleFactory,
  getModuleLoaderPath,
  isStringLiteral,
  unwrapTypeScriptValue,
} from './helpers.js';

const SAP_UI_DEFINE = 'sap.ui.define';
const MAX_SCOPE_INITIALIZER_ARGUMENTS = 3;

/**
 * Track direct loader factories and writes to their ambient API paths.
 *
 * `define([], function () {})` can be excluded without a nested function.
 * `sap.ui.define([], function () { function nested() {} })` can be excluded.
 * A write such as `sap.ui = other` keeps both functions checked.
 */
export class ModuleInitializerTracker {
  private readonly scopeInitializers = new Map<estree.Node, string[]>();
  private readonly writeTargets: estree.Node[] = [];

  constructor(private readonly hasRuntimeBinding: (node: estree.Node, name: string) => boolean) {}

  private invalidateWithWrite(target: estree.Node, remainingPaths: Map<string, string[]>): void {
    const value = unwrapTypeScriptValue(target);
    const path = getModuleLoaderPath(value, true);
    if (path) {
      this.invalidateLoaderPath(value, path, remainingPaths);
      return;
    }

    switch (value.type) {
      case 'ArrayPattern':
        this.invalidateArrayPattern(value, remainingPaths);
        break;
      case 'ObjectPattern':
        this.invalidateObjectPattern(value, remainingPaths);
        break;
      case 'AssignmentPattern':
        this.invalidateWithWrite(value.left, remainingPaths);
        break;
      case 'RestElement':
        this.invalidateWithWrite(value.argument, remainingPaths);
        break;
    }
  }

  private invalidateLoaderPath(
    value: estree.Node,
    path: (string | undefined)[],
    remainingPaths: Map<string, string[]>,
  ): void {
    if (this.hasRuntimeBinding(value, path[0] ?? '')) {
      return;
    }
    for (const [key, candidate] of remainingPaths) {
      if (isPathPrefix(path, candidate)) {
        remainingPaths.delete(key);
      }
    }
  }

  private invalidateArrayPattern(
    pattern: estree.ArrayPattern,
    remainingPaths: Map<string, string[]>,
  ): void {
    for (const element of pattern.elements) {
      if (remainingPaths.size === 0) {
        break;
      }
      if (element) {
        this.invalidateWithWrite(element, remainingPaths);
      }
    }
  }

  private invalidateObjectPattern(
    pattern: estree.ObjectPattern,
    remainingPaths: Map<string, string[]>,
  ): void {
    for (const property of pattern.properties) {
      if (remainingPaths.size === 0) {
        break;
      }
      const target = property.type === 'RestElement' ? property.argument : property.value;
      this.invalidateWithWrite(target, remainingPaths);
    }
  }

  recordCall(call: estree.CallExpression) {
    const amdFactory = getModuleFactory(call, this.hasRuntimeBinding);
    if (amdFactory) {
      this.scopeInitializers.set(amdFactory, ['define']);
    }
    const initializer = getScopeInitializer(call, this.hasRuntimeBinding);
    if (initializer) {
      this.scopeInitializers.set(initializer.factory, initializer.path);
    }
  }

  recordWrite(target: estree.Node) {
    this.writeTargets.push(target);
  }

  /** Resolve the file-wide write guard after visiting the whole file. */
  getExcludedFactories(hasNestedFunction: (node: estree.Node) => boolean): Set<estree.Node> {
    const excluded = new Set<estree.Node>();
    if (this.scopeInitializers.size === 0) {
      return excluded;
    }
    const eligibleFactories = new Map<estree.Node, string>();
    const remainingPaths = new Map<string, string[]>();
    for (const [factory, path] of this.scopeInitializers) {
      if (path[0] === 'define' || hasNestedFunction(factory)) {
        const key = path.join('.');
        eligibleFactories.set(factory, key);
        remainingPaths.set(key, path);
      }
    }
    for (const target of this.writeTargets) {
      if (remainingPaths.size === 0) {
        break;
      }
      this.invalidateWithWrite(target, remainingPaths);
    }
    for (const [factory, key] of eligibleFactories) {
      if (remainingPaths.has(key)) {
        excluded.add(factory);
      }
    }
    return excluded;
  }
}

/**
 * `sap.ui.define([], function () {})` -> factory and ['sap', 'ui', 'define']
 * `sap.ui['define']([], function () {})` -> undefined
 */
function getScopeInitializer(
  call: estree.CallExpression,
  hasRuntimeBinding: (node: estree.Node, name: string) => boolean,
) {
  const { callee } = call;
  if (
    ('optional' in call && call.optional) ||
    call.arguments.length < 2 ||
    call.arguments.length > MAX_SCOPE_INITIALIZER_ARGUMENTS + 1 ||
    (callee.type === 'Identifier'
      ? callee.name !== 'require'
      : callee.type !== 'MemberExpression' ||
        callee.computed ||
        callee.optional ||
        callee.property.type !== 'Identifier' ||
        !['define', 'require', 'register'].includes(callee.property.name))
  ) {
    return undefined;
  }
  const path = getModuleLoaderPath(callee, false);
  const name = path?.join('.') ?? '';
  if (!path || ![SAP_UI_DEFINE, 'require', 'sap.ui.require', 'System.register'].includes(name)) {
    return undefined;
  }
  const args = call.arguments.map(unwrapTypeScriptValue);
  if (name === SAP_UI_DEFINE && isStringLiteral(args[0])) {
    args.shift();
  }
  const [dependencies, factory, extra] = args;
  if (
    args.length < 2 ||
    args.length > MAX_SCOPE_INITIALIZER_ARGUMENTS ||
    dependencies?.type !== 'ArrayExpression' ||
    !dependencies.elements.every(isStringLiteral) ||
    !isSynchronousFunction(factory)
  ) {
    return undefined;
  }
  if (
    !isValidScopeInitializerExtra(name, extra, dependencies.elements.length) ||
    hasRuntimeBinding(call, path[0])
  ) {
    return undefined;
  }
  return { factory, path };
}

/**
 * `sap.ui.define([], function () {}, true)` -> true
 * `System.register(['dep'], function () {}, [{}])` -> true
 * `sap.ui.define([], function () {}, 0)` -> false
 */
function isValidScopeInitializerExtra(
  name: string,
  extra: estree.Node | undefined,
  dependencyCount: number,
): boolean {
  if (!extra) {
    return true;
  }
  if (name === SAP_UI_DEFINE) {
    return extra.type === 'Literal' && typeof extra.value === 'boolean';
  }
  if (name === 'System.register') {
    return (
      extra.type === 'ArrayExpression' &&
      extra.elements.length === dependencyCount &&
      extra.elements.every(element =>
        element ? unwrapTypeScriptValue(element).type === 'ObjectExpression' : false,
      )
    );
  }
  return isFunctionNode(extra);
}

/**
 * `function () {}` -> true
 * `async function () {}` -> false
 * `() => {}` -> false
 */
function isSynchronousFunction(node: estree.Node | undefined): node is estree.FunctionExpression {
  return node?.type === 'FunctionExpression' && !node.async && !node.generator;
}

/** `['sap', 'ui', undefined]` matches `['sap', 'ui', 'define']`. */
function isPathPrefix(prefix: (string | undefined)[], path: string[]): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((part, index) => part === undefined || part === path[index])
  );
}
