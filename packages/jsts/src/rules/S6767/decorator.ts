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
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the no-unused-prop-types rule to suppress false positives when
 * props are used indirectly through patterns the upstream rule cannot track:
 * helper method calls, spread operators, bracket notation, forwardRef,
 * context providers, HOC wrappers, exported interfaces, and super(props).
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (hasIndirectPropsUsage(context.sourceCode.ast as TSESTree.Program)) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * Scans the program AST for indirect prop usage patterns that the upstream
 * rule cannot track. Returns true if any such pattern is found.
 */
function hasIndirectPropsUsage(program: TSESTree.Program): boolean {
  return hasPattern(program);
}

function hasPattern(node: TSESTree.Node): boolean {
  if (isIndirectPropsPattern(node)) {
    return true;
  }
  for (const child of getChildren(node)) {
    if (hasPattern(child)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a node represents an indirect props usage pattern.
 * Patterns included here indicate the entire props object may be consumed
 * indirectly or that the component is part of a larger HOC wrapper pattern.
 */
function isIndirectPropsPattern(node: TSESTree.Node): boolean {
  return (
    isPropsPassedToFunction(node) ||
    isPropsSpread(node) ||
    isBracketNotationOnProps(node) ||
    isForwardRefWrapper(node) ||
    isContextProviderWithProps(node) ||
    isHOCExportWrapper(node) ||
    isExportedPropsInterface(node) ||
    isSuperWithProps(node)
  );
}

/** Detects: someFunction(props) or someFunction(this.props) */
function isPropsPassedToFunction(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as TSESTree.CallExpression;
  // Exclude super(props) — handled separately
  if (call.callee.type === 'Super') {
    return false;
  }
  return call.arguments.some(isPropsReference);
}

/** Detects: {...props} or {...this.props} */
function isPropsSpread(node: TSESTree.Node): boolean {
  if (node.type !== 'SpreadElement' && node.type !== 'JSXSpreadAttribute') {
    return false;
  }
  const spread = node as TSESTree.SpreadElement | TSESTree.JSXSpreadAttribute;
  return isPropsReference(spread.argument);
}

/** Detects: props[key] or this.props[key] */
function isBracketNotationOnProps(node: TSESTree.Node): boolean {
  if (node.type !== 'MemberExpression') {
    return false;
  }
  const member = node as TSESTree.MemberExpression;
  return member.computed && isPropsReference(member.object);
}

/** Detects: React.forwardRef(...) or forwardRef(...) wrapping a component */
function isForwardRefWrapper(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as TSESTree.CallExpression;
  const callee = call.callee;
  // Match bare forwardRef(...) call
  if (callee.type === 'Identifier') {
    return (callee as TSESTree.Identifier).name === 'forwardRef';
  }
  // Match React.forwardRef(...) member expression call
  if (callee.type === 'MemberExpression') {
    const member = callee as TSESTree.MemberExpression;
    return (
      member.object.type === 'Identifier' &&
      (member.object as TSESTree.Identifier).name === 'React' &&
      member.property.type === 'Identifier' &&
      (member.property as TSESTree.Identifier).name === 'forwardRef'
    );
  }
  return false;
}

/** Detects: <Context.Provider value={props}> */
function isContextProviderWithProps(node: TSESTree.Node): boolean {
  if (node.type !== 'JSXAttribute') {
    return false;
  }
  const attr = node as TSESTree.JSXAttribute;
  if (attr.name.type !== 'JSXIdentifier' || attr.name.name !== 'value') {
    return false;
  }
  if (!attr.value || attr.value.type !== 'JSXExpressionContainer') {
    return false;
  }
  const expr = attr.value.expression;
  if (expr.type === 'JSXEmptyExpression') {
    return false;
  }
  return isPropsReference(expr as TSESTree.Expression);
}

/**
 * Detects HOC export wrapper patterns:
 * - export default connect(mapState)(Component)
 * - export default Relay.createContainer(Component, ...)
 * - export default withRouter(Component)
 * - export const Container = connect(mapState)(Component)
 * - module.exports = HOC(Component)
 *
 * These patterns indicate the component receives props injected by the HOC
 * that the upstream rule cannot track as used.
 */
function isHOCExportWrapper(node: TSESTree.Node): boolean {
  // export default HOC(Component)
  if (node.type === 'ExportDefaultDeclaration') {
    const decl = node as TSESTree.ExportDefaultDeclaration;
    return isHOCCallExpression(decl.declaration);
  }
  // export const Foo = HOC(config)(Component) — curried HOC pattern only
  if (node.type === 'ExportNamedDeclaration') {
    const exportDecl = node as TSESTree.ExportNamedDeclaration;
    if (exportDecl.declaration && exportDecl.declaration.type === 'VariableDeclaration') {
      const varDecl = exportDecl.declaration as TSESTree.VariableDeclaration;
      return varDecl.declarations.some(d => d.init != null && isCurriedHOCCallExpression(d.init));
    }
  }
  // module.exports = HOC(Component)
  if (node.type === 'AssignmentExpression') {
    const assign = node as TSESTree.AssignmentExpression;
    if (isModuleExports(assign.left)) {
      return isHOCCallExpression(assign.right);
    }
  }
  return false;
}

/**
 * Checks if a node is a call expression that wraps a component (HOC pattern).
 * Matches: HOC(Component), HOC(Component, config), HOC(config)(Component)
 */
function isHOCCallExpression(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as TSESTree.CallExpression;
  // If the callee itself is a call expression, this is a curried HOC: HOC(config)(Component)
  if (call.callee.type === 'CallExpression') {
    return true;
  }
  // HOC(Component) or HOC(Component, config) — must have at least one argument
  return call.arguments.length > 0;
}

/**
 * Checks if a node is a curried HOC call like HOC(config)(Component).
 * More specific than isHOCCallExpression; used for named exports to avoid
 * false negatives from ordinary function calls.
 */
function isCurriedHOCCallExpression(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as TSESTree.CallExpression;
  // The callee itself must be a call expression: HOC(config)(Component)
  return call.callee.type === 'CallExpression';
}

/** Checks if a node is `module.exports` */
function isModuleExports(node: TSESTree.Node): boolean {
  if (node.type !== 'MemberExpression') {
    return false;
  }
  const member = node as TSESTree.MemberExpression;
  return (
    !member.computed &&
    member.object.type === 'Identifier' &&
    (member.object as TSESTree.Identifier).name === 'module' &&
    member.property.type === 'Identifier' &&
    (member.property as TSESTree.Identifier).name === 'exports'
  );
}

/**
 * Detects exported props interface or type declarations whose name indicates
 * they are component props:
 * - export interface FooProps { ... }
 * - export type FooProps = { ... }
 *
 * When the props interface is exported, other modules can use it to pass
 * props that won't be tracked by the upstream rule. We check for "Props"
 * in the name to avoid false negatives from unrelated exported types.
 */
function isExportedPropsInterface(node: TSESTree.Node): boolean {
  // export interface FooProps { ... } or export type FooProps = ...
  if (node.type === 'ExportNamedDeclaration') {
    const exportDecl = node as TSESTree.ExportNamedDeclaration;
    if (!exportDecl.declaration) {
      return false;
    }
    const decl = exportDecl.declaration;
    // export interface FooProps { ... }
    if (decl.type === 'TSInterfaceDeclaration') {
      const name = (decl as TSESTree.TSInterfaceDeclaration).id.name;
      return name.includes('Props') || name.includes('Properties');
    }
    // export type FooProps = { ... }
    if (decl.type === 'TSTypeAliasDeclaration') {
      const name = (decl as TSESTree.TSTypeAliasDeclaration).id.name;
      return name.includes('Props') || name.includes('Properties');
    }
  }
  return false;
}

/**
 * Detects super(props) calls in class constructors.
 * When a component passes props to its parent class constructor, it indicates
 * the component follows React class component conventions. The parent class
 * may consume some of those props, or the props may be used indirectly
 * through class lifecycle methods or inherited functionality.
 */
function isSuperWithProps(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as TSESTree.CallExpression;
  if (call.callee.type !== 'Super') {
    return false;
  }
  return call.arguments.some(isPropsReference);
}

/** Checks if a node is `props` (Identifier) or `this.props` (MemberExpression) */
function isPropsReference(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return (node as TSESTree.Identifier).name === 'props';
  }
  if (node.type === 'MemberExpression') {
    const member = node as TSESTree.MemberExpression;
    return (
      !member.computed &&
      member.object.type === 'ThisExpression' &&
      member.property.type === 'Identifier' &&
      (member.property as TSESTree.Identifier).name === 'props'
    );
  }
  return false;
}

/** Returns the child nodes of a given node for traversal */
function getChildren(node: TSESTree.Node): TSESTree.Node[] {
  const children: TSESTree.Node[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const value = (node as unknown as Record<string, unknown>)[key];
    if (value && typeof value === 'object') {
      if (isNode(value)) {
        children.push(value as TSESTree.Node);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && isNode(item)) {
            children.push(item as TSESTree.Node);
          }
        }
      }
    }
  }
  return children;
}

function isNode(value: unknown): boolean {
  return typeof (value as TSESTree.Node).type === 'string';
}
