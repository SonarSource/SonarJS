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
import type estree from 'estree';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the react/no-unused-prop-types rule to suppress false positives
 * when props are used indirectly through patterns the upstream rule cannot track.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (hasIndirectPropsUsage(context)) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

// Cache scan results per file to avoid re-scanning for each reported issue
const scanCache = new WeakMap<Rule.RuleContext['sourceCode'], boolean>();

/**
 * Checks whether the file contains any indirect props usage pattern that
 * the upstream rule cannot track, making unused-prop reports unreliable.
 */
function hasIndirectPropsUsage(context: Rule.RuleContext): boolean {
  const sourceCode = context.sourceCode;
  let result = scanCache.get(sourceCode);
  if (result === undefined) {
    result = scanNode(sourceCode.ast);
    scanCache.set(sourceCode, result);
  }
  return result;
}

/**
 * Recursively scans an AST node and its children for indirect props usage patterns.
 */
function scanNode(node: estree.Node): boolean {
  switch (node.type) {
    case 'CallExpression':
      return isForwardRefCall(node) || isPropsPassedToFunction(node) || scanChildren(node);
    case 'SpreadElement':
      return isPropsSpread(node) || scanChildren(node);
    case 'JSXSpreadAttribute':
      return isPropsJsxSpread(node) || scanChildren(node);
    case 'MemberExpression':
      return isBracketPropsAccess(node) || scanChildren(node);
    case 'VariableDeclarator':
      return isRestDestructuringOfProps(node) || scanChildren(node);
    case 'JSXExpressionContainer':
      return isPropsAsJsxAttributeValue(node) || scanChildren(node);
    case 'MethodDefinition':
      return isDerivedStateFromProps(node) || scanChildren(node);
    default:
      return scanChildren(node);
  }
}

/**
 * Scans all child nodes of the given node.
 */
function scanChildren(node: estree.Node): boolean {
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const value = (node as unknown as Record<string, unknown>)[key];
    if (scanChildValue(value)) {
      return true;
    }
  }
  return false;
}

/**
 * Scans a single child value which may be a node or an array of nodes.
 */
function scanChildValue(value: unknown): boolean {
  if (isNode(value)) {
    return scanNode(value);
  }
  if (Array.isArray(value)) {
    return value.some(item => isNode(item) && scanNode(item));
  }
  return false;
}

function isNode(value: unknown): value is estree.Node {
  return typeof value === 'object' && value !== null && 'type' in value;
}

/**
 * Pattern: Props passed to function
 * `someFunction(props)`, `someFunction(this.props)`
 * When the entire props object is passed to a function, any prop may be
 * consumed inside that function.
 * Note: `super(props)` is excluded as it is standard React class component
 * boilerplate that does not indicate indirect prop consumption.
 */
function isPropsPassedToFunction(node: estree.CallExpression): boolean {
  if (node.callee.type === 'Super') {
    return false;
  }
  return node.arguments.some(isPropsReference);
}

/**
 * Pattern: Props spread
 * `{...props}`, `{...this.props}` in object expressions
 */
function isPropsSpread(node: estree.SpreadElement): boolean {
  return isPropsReference(node.argument);
}

/**
 * Pattern: Props spread in JSX
 * `<div {...props}>` or `<div {...this.props}>`
 */
function isPropsJsxSpread(node: estree.Node): boolean {
  // JSXSpreadAttribute has an `argument` property
  const argument = (node as { argument?: estree.Node }).argument;
  return argument != null && isPropsReference(argument);
}

/**
 * Pattern: Bracket notation access
 * `props[key]` or `this.props[key]`
 * Dynamic property access means any prop could be read.
 */
function isBracketPropsAccess(node: estree.MemberExpression): boolean {
  return node.computed && isPropsReference(node.object);
}

/**
 * Pattern: Rest destructuring of props
 * `const { children, ...rest } = props` or `const { x, ...rest } = this.props`
 * Rest elements capture all remaining props, making them available indirectly.
 */
function isRestDestructuringOfProps(node: estree.VariableDeclarator): boolean {
  if (node.id.type !== 'ObjectPattern' || !node.init) {
    return false;
  }
  const hasRestElement = node.id.properties.some(p => p.type === 'RestElement');
  return hasRestElement && isPropsReference(node.init);
}

/**
 * Pattern: forwardRef wrapper
 * `React.forwardRef((props, ref) => ...)` or `forwardRef((props, ref) => ...)`
 * Props tracking through forwardRef wrappers is unreliable in the upstream rule.
 */
function isForwardRefCall(node: estree.CallExpression): boolean {
  const { callee } = node;
  if (callee.type === 'Identifier' && callee.name === 'forwardRef') {
    return true;
  }
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'forwardRef'
  ) {
    return true;
  }
  return false;
}

/**
 * Pattern: getDerivedStateFromProps lifecycle method
 * `static getDerivedStateFromProps(props, state) { return { ...props }; }`
 * When a class component defines getDerivedStateFromProps with the full props
 * object as a parameter (not destructured), it may capture all props into state.
 * The upstream rule cannot track prop usage through state, so any prop reported
 * as unused may actually be consumed via the state snapshot.
 * If the first parameter is destructured (ObjectPattern), only specific props are
 * used, so suppression is not needed.
 */
function isDerivedStateFromProps(node: estree.Node): boolean {
  const method = node as estree.MethodDefinition;
  if (
    method.static !== true ||
    method.key.type !== 'Identifier' ||
    method.key.name !== 'getDerivedStateFromProps'
  ) {
    return false;
  }
  const fn = method.value;
  if (fn.type === 'FunctionExpression' && fn.params.length > 0) {
    return fn.params[0].type !== 'ObjectPattern';
  }
  return true;
}

/**
 * Pattern: Props as JSX attribute value
 * `<Provider value={props}>` or `<Context.Provider value={this.props}>`
 * When props object is passed as a JSX attribute value, all properties are available
 * to the consuming component.
 */
function isPropsAsJsxAttributeValue(node: estree.Node): boolean {
  // JSXExpressionContainer wraps the expression in a JSX attribute value
  const expression = (node as { expression?: estree.Node }).expression;
  return expression != null && isPropsReference(expression);
}

/**
 * Checks if a node refers to the props object: `props` identifier,
 * `this.props` member expression, or a rest element from props destructuring.
 */
function isPropsReference(node: estree.Node): boolean {
  // Direct `props` identifier
  if (node.type === 'Identifier' && node.name === 'props') {
    return true;
  }
  // `this.props` member expression
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
