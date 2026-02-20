/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6767/javascript

import type { Rule } from 'eslint';
import type { Node, Program } from 'estree';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const cache = new WeakMap<Program, boolean>();
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      const ast = context.sourceCode.ast;
      let result = cache.get(ast);
      if (result === undefined) {
        result = hasIndirectPropsUsage(ast);
        cache.set(ast, result);
      }
      if (result) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * Checks if the file contains any pattern indicating that props are used
 * indirectly (passed to functions, spread, dynamic access, etc.).
 * When such patterns exist, the upstream rule's unused-prop reports are
 * likely false positives.
 */
function hasIndirectPropsUsage(ast: Program): boolean {
  return hasPattern(ast, isIndirectPropsUsageNode) || hasPropsClosureInNestedFunction(ast);
}

function hasPattern(node: Node, predicate: (node: Node) => boolean): boolean {
  return predicate(node) || hasPatternInChildren(node, predicate);
}

function hasPatternInChildren(node: Node, predicate: (node: Node) => boolean): boolean {
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = (node as unknown as Record<string, unknown>)[key];
    if (isNode(child) && hasPattern(child, predicate)) {
      return true;
    }
    if (Array.isArray(child) && hasPatternInArray(child, predicate)) {
      return true;
    }
  }
  return false;
}

function hasPatternInArray(elements: unknown[], predicate: (node: Node) => boolean): boolean {
  for (const element of elements) {
    if (isNode(element) && hasPattern(element, predicate)) {
      return true;
    }
  }
  return false;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'type' in value;
}

function isIndirectPropsUsageNode(node: Node): boolean {
  return (
    isPropsPassedToFunction(node) ||
    isPropsSpread(node) ||
    isPropsBracketAccess(node) ||
    isExportedPropsInterface(node) ||
    isHocExport(node) ||
    isForwardRefWrapper(node) ||
    isPropsAsJSXAttributeValue(node) ||
    isPropsAsObjectPropertyValue(node) ||
    isDecoratorWithPropsCallback(node)
  );
}

/** props or this.props passed as argument to any function call (excluding super()) */
function isPropsPassedToFunction(node: Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  if (node.callee.type === 'Super') {
    return false;
  }
  return node.arguments.some(isPropsReference);
}

/** {...props} or {...this.props} in object or JSX, or rest destructuring from props */
function isPropsSpread(node: Node): boolean {
  if (node.type === 'SpreadElement') {
    return isPropsReference(node.argument);
  }
  if (node.type === 'JSXSpreadAttribute') {
    return isPropsReference((node as unknown as { argument: Node }).argument);
  }
  // const { x, ...rest } = props
  if (
    node.type === 'VariableDeclarator' &&
    node.id.type === 'ObjectPattern' &&
    node.init != null &&
    isPropsReference(node.init) &&
    node.id.properties.some(p => p.type === 'RestElement')
  ) {
    return true;
  }
  return false;
}

/** props[key] or this.props[key] */
function isPropsBracketAccess(node: Node): boolean {
  return node.type === 'MemberExpression' && node.computed && isPropsReference(node.object);
}

/** export interface/type whose name contains "Props" (public API for props) */
function isExportedPropsInterface(node: Node): boolean {
  if (node.type !== 'ExportNamedDeclaration' || !node.declaration) {
    return false;
  }
  const decl = node.declaration;
  if (
    decl.type === ('TSInterfaceDeclaration' as string) ||
    decl.type === ('TSTypeAliasDeclaration' as string)
  ) {
    const name = (decl as unknown as { id: { name: string } }).id?.name ?? '';
    return /props/i.test(name);
  }
  return false;
}

/** export default SomeHoc(Component) */
function isHocExport(node: Node): boolean {
  if (node.type === 'ExportDefaultDeclaration') {
    return node.declaration.type === 'CallExpression';
  }
  return false;
}

/** React.forwardRef wrapper */
function isForwardRefWrapper(node: Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'React' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'forwardRef'
  ) {
    return true;
  }
  if (callee.type === 'Identifier' && callee.name === 'forwardRef') {
    return true;
  }
  return false;
}

/** Props object passed as JSX attribute value, e.g. <Comp data={props} /> */
function isPropsAsJSXAttributeValue(node: Node): boolean {
  if (node.type !== 'JSXAttribute') {
    return false;
  }
  const attr = node as unknown as { name: { name?: string }; value: Node | null };
  if (attr.value?.type === ('JSXExpressionContainer' as string)) {
    const container = attr.value as unknown as { expression: Node };
    return isPropsReference(container.expression);
  }
  return false;
}

/** Props object used as value in an object property, e.g. { passProps: props } */
function isPropsAsObjectPropertyValue(node: Node): boolean {
  if (node.type !== 'Property') {
    return false;
  }
  return isPropsReference(node.value);
}

/** Decorator with a callback that receives props, e.g. @track((props) => ...) */
function isDecoratorWithPropsCallback(node: Node): boolean {
  if (node.type !== ('Decorator' as string)) {
    return false;
  }
  const decorator = node as unknown as { expression: Node };
  const expr = decorator.expression;
  if (expr?.type !== 'CallExpression') {
    return false;
  }
  const call = expr as unknown as { arguments: Node[] };
  return call.arguments.some(arg => {
    if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
      const fn = arg as unknown as { params: Node[] };
      return (
        fn.params.length > 0 &&
        fn.params[0].type === 'Identifier' &&
        (fn.params[0] as unknown as { name: string }).name === 'props'
      );
    }
    return false;
  });
}

/** Matches `props` identifier or `this.props` member expression */
function isPropsReference(node: Node): boolean {
  if (node.type === 'Identifier' && node.name === 'props') {
    return true;
  }
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'ThisExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'props'
  ) {
    return true;
  }
  return false;
}

/**
 * Detects when a function component's `props` parameter is accessed via `props.X`
 * inside a nested function that does NOT have its own `props` parameter.
 * The upstream rule misses prop usage through closures like:
 *   const Comp = (props) => { const Inner = () => <div>{props.title}</div>; }
 */
function hasPropsClosureInNestedFunction(ast: Program): boolean {
  return hasPattern(ast, node => {
    if (!isFunctionWithPropsParam(node)) {
      return false;
    }
    const body = getFunctionBody(node);
    if (!body) {
      return false;
    }
    return hasNestedFunctionAccessingPropsClosure(body);
  });
}

function isFunctionWithPropsParam(node: Node): boolean {
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration'
  ) {
    const fn = node as unknown as { params: Node[] };
    return fn.params.some(
      p => p.type === 'Identifier' && (p as unknown as { name: string }).name === 'props',
    );
  }
  return false;
}

function getFunctionBody(node: Node): Node | null {
  const fn = node as unknown as { body: Node };
  return fn.body ?? null;
}

/** Checks if a subtree contains a nested function (without own `props` param) that accesses `props.X` */
function hasNestedFunctionAccessingPropsClosure(node: Node): boolean {
  return hasPatternInChildren(node, isNestedFunctionWithPropsClosure);
}

function isNestedFunctionWithPropsClosure(node: Node): boolean {
  if (
    node.type !== 'ArrowFunctionExpression' &&
    node.type !== 'FunctionExpression' &&
    node.type !== 'FunctionDeclaration'
  ) {
    return false;
  }
  const fn = node as unknown as { params: Node[] };
  const hasOwnPropsParam = fn.params.some(
    p => p.type === 'Identifier' && (p as unknown as { name: string }).name === 'props',
  );
  if (hasOwnPropsParam) {
    return false;
  }
  const body = getFunctionBody(node);
  if (!body) {
    return false;
  }
  return hasPattern(
    body,
    n =>
      n.type === 'MemberExpression' &&
      !n.computed &&
      n.object.type === 'Identifier' &&
      (n.object as unknown as { name: string }).name === 'props',
  );
}
