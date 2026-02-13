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

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type { JSXExpressionContainer, JSXSpreadAttribute } from 'estree-jsx';
import { childrenOf, generateMeta, interceptReportForReact } from '../helpers/index.js';
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
      if ('node' in reportDescriptor && isInExportedType(reportDescriptor.node)) {
        return;
      }
      if (hasIndirectPropsUsage(context)) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

/**
 * Checks whether the file contains any indirect props usage pattern that
 * the upstream rule cannot track, making unused-prop reports unreliable.
 */
function hasIndirectPropsUsage(context: Rule.RuleContext): boolean {
  return scanNode(context.sourceCode.ast, context.sourceCode.visitorKeys);
}

/**
 * Recursively scans an AST node and its children for indirect props usage patterns.
 */
function scanNode(node: estree.Node, visitorKeys: SourceCode.VisitorKeys): boolean {
  switch (node.type) {
    case 'CallExpression':
      return (
        isForwardRefCall(node) || isPropsPassedToFunction(node) || scanChildren(node, visitorKeys)
      );
    case 'SpreadElement':
      return isPropsSpread(node) || scanChildren(node, visitorKeys);
    case 'JSXSpreadAttribute':
      return isPropsJsxSpread(node) || scanChildren(node, visitorKeys);
    case 'MemberExpression':
      return isBracketPropsAccess(node) || scanChildren(node, visitorKeys);
    case 'VariableDeclarator':
      return isRestDestructuringOfProps(node) || scanChildren(node, visitorKeys);
    case 'JSXExpressionContainer':
      return isPropsAsJsxAttributeValue(node) || scanChildren(node, visitorKeys);
    case 'MethodDefinition':
      return isDerivedStateFromProps(node) || scanChildren(node, visitorKeys);
    default:
      return scanChildren(node, visitorKeys);
  }
}

/**
 * Scans all child nodes of the given node.
 */
function scanChildren(node: estree.Node, visitorKeys: SourceCode.VisitorKeys): boolean {
  return childrenOf(node, visitorKeys).some(child => scanNode(child, visitorKeys));
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
function isPropsJsxSpread(node: JSXSpreadAttribute): boolean {
  return isPropsReference(node.argument);
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
function isPropsAsJsxAttributeValue(node: JSXExpressionContainer): boolean {
  return isPropsReference(node.expression);
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

/**
 * Checks if the reported prop node belongs to an exported type or interface.
 * Exported prop types are public API contracts — consumers may use any declared
 * property, so reporting them as unused is a false positive.
 */
function isInExportedType(node: estree.Node): boolean {
  let current: TSESTree.Node | undefined = node as TSESTree.Node;
  while (current) {
    if (current.type === 'TSInterfaceDeclaration' || current.type === 'TSTypeAliasDeclaration') {
      return current.parent?.type === 'ExportNamedDeclaration';
    }
    current = current.parent;
  }
  return false;
}
