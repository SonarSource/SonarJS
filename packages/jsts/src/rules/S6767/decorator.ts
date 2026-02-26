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
 * context providers, HOC wrappers, and super(props).
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
    isRelayHOCCall(node) ||
    isSuperWithProps(node) ||
    isDecoratorWithPropsCallback(node)
  );
}

/** Known prop-validation-only functions that do not consume props for functionality */
const PROP_VALIDATION_FUNCTIONS = new Set(['checkPropTypes']);

/** Detects: someFunction(props) or someFunction(this.props) */
function isPropsPassedToFunction(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  // Exclude super(props) — handled separately
  if (node.callee.type === 'Super') {
    return false;
  }
  // Exclude PropTypes.checkPropTypes(propTypes, props, ...) — only validates, does not consume
  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    PROP_VALIDATION_FUNCTIONS.has(node.callee.property.name)
  ) {
    return false;
  }
  return node.arguments.some(isPropsReference);
}

/** Detects: {...props} or {...this.props} */
function isPropsSpread(node: TSESTree.Node): boolean {
  if (node.type !== 'SpreadElement' && node.type !== 'JSXSpreadAttribute') {
    return false;
  }
  return isPropsReference(node.argument);
}

/** Detects: props[key] or this.props[key] */
function isBracketNotationOnProps(node: TSESTree.Node): boolean {
  if (node.type !== 'MemberExpression') {
    return false;
  }
  return node.computed && isPropsReference(node.object);
}

/** Detects: React.forwardRef(...) or forwardRef(...) wrapping a component */
function isForwardRefWrapper(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const { callee } = node;
  // Match bare forwardRef(...) call
  if (callee.type === 'Identifier') {
    return callee.name === 'forwardRef';
  }
  // Match React.forwardRef(...) member expression call
  if (callee.type === 'MemberExpression') {
    return (
      callee.object.type === 'Identifier' &&
      callee.object.name === 'React' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'forwardRef'
    );
  }
  return false;
}

/** Detects: <Context.Provider value={props}> */
function isContextProviderWithProps(node: TSESTree.Node): boolean {
  if (node.type !== 'JSXAttribute') {
    return false;
  }
  if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'value') {
    return false;
  }
  if (node.value?.type !== 'JSXExpressionContainer') {
    return false;
  }
  const expr = node.value.expression;
  if (expr.type === 'JSXEmptyExpression') {
    return false;
  }
  return isPropsReference(expr);
}

/** Known Relay/React HOC function names that inject props into wrapped components */
const RELAY_HOC_NAMES = new Set([
  'createFragmentContainer',
  'createPaginationContainer',
  'createRefetchContainer',
  'createContainer',
]);

/**
 * Detects non-exported Relay HOC calls that wrap a component:
 * - const Container = createFragmentContainer(Component, {...})
 * - const Container = createPaginationContainer(Component, {...})
 *
 * These are often not exported directly but still inject props (like `relay`)
 * that the upstream rule cannot track as used.
 */
function isRelayHOCCall(node: TSESTree.Node): boolean {
  if (node.type !== 'VariableDeclaration') {
    return false;
  }
  return node.declarations.some(d => {
    if (d.init == null || d.init.type !== 'CallExpression') {
      return false;
    }
    const { callee } = d.init;
    // Check for Relay HOC function names
    if (callee.type === 'Identifier') {
      return RELAY_HOC_NAMES.has(callee.name);
    }
    // Support member expression: Relay.createContainer(...)
    if (callee.type === 'MemberExpression') {
      return (
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        RELAY_HOC_NAMES.has(callee.property.name)
      );
    }
    return false;
  });
}

/**
 * Detects TypeScript/ES decorator patterns where props are passed as a callback
 * argument to a decorator function:
 * - @track((props) => ({ context_module: props.contextModule }))
 * - @screenTrack((props: Props) => ({ ... }))
 *
 * When decorators with props callbacks are present, props may be consumed
 * by the decorator framework and thus not directly accessed in the component body.
 */
function isDecoratorWithPropsCallback(node: TSESTree.Node): boolean {
  if (node.type !== 'Decorator') {
    return false;
  }
  if (node.expression.type !== 'CallExpression') {
    return false;
  }
  // Check if any argument is a function that has a first parameter
  return node.expression.arguments.some(arg => {
    if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
      return arg.params.length > 0;
    }
    return false;
  });
}

/**
 * Detects HOC export wrapper patterns:
 * - export default connect(mapState)(Component)
 * - export default Relay.createContainer(Component, ...)
 * - export default withRouter(Component)
 * - export const Container = connect(mapState)(Component)
 * - export const Container = createFragmentContainer(Component, {...})
 * - const Container = HOC(Component); export default Container
 * - module.exports = HOC(Component)
 *
 * These patterns indicate the component receives props injected by the HOC
 * that the upstream rule cannot track as used.
 */
function isHOCExportWrapper(node: TSESTree.Node): boolean {
  // export default HOC(Component) or export default identifier (indirect HOC)
  if (node.type === 'ExportDefaultDeclaration') {
    return isHOCCallExpression(node.declaration);
  }
  // export const Foo = HOC(Component) or export const Foo = HOC(config)(Component)
  if (node.type === 'ExportNamedDeclaration') {
    if (node.declaration?.type === 'VariableDeclaration') {
      // Allow both single-call (createFragmentContainer(Comp, config)) and curried HOC
      return node.declaration.declarations.some(d => d.init != null && isHOCCallExpression(d.init));
    }
  }
  // module.exports = HOC(Component)
  if (node.type === 'AssignmentExpression') {
    if (isModuleExports(node.left)) {
      return isHOCCallExpression(node.right);
    }
  }
  return false;
}

/**
 * Checks if a node is a call expression that wraps a component (HOC pattern).
 * Matches: HOC(Component), HOC(Component, config), HOC(config)(Component),
 *          HOC(HOC2(Component), config)
 *
 * For single-call HOCs (non-curried), requires the first argument to be either:
 * - a component-like identifier (starts with uppercase letter by React convention), or
 * - a call expression (another HOC wrapping the component, e.g. withRouter(Component))
 * This avoids false suppression for utility exports like `React.createContext({...})`.
 */
function isHOCCallExpression(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  // If the callee itself is a call expression, this is a curried HOC: HOC(config)(Component)
  if (node.callee.type === 'CallExpression') {
    return true;
  }
  // HOC(Component) or HOC(Component, config) — first argument must be a component-like identifier
  // (starts with uppercase letter by React convention) to avoid false suppression on
  // utility exports like `export const Ctx = React.createContext({...})`
  // Also matches HOC(HOC2(Component), config) where the first argument is another HOC call
  if (node.arguments.length === 0) {
    return false;
  }
  const firstArg = node.arguments[0];
  if (firstArg.type === 'Identifier') {
    return /^[A-Z]/.test(firstArg.name);
  }
  // First argument is a call expression: HOC(anotherHOC(Component), config)
  // e.g. Relay.createContainer(withRouter(AlgoliaPopupIndexes), {...})
  if (firstArg.type === 'CallExpression') {
    return true;
  }
  return false;
}

/** Checks if a node is `module.exports` */
function isModuleExports(node: TSESTree.Node): boolean {
  if (node.type !== 'MemberExpression') {
    return false;
  }
  return (
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.object.name === 'module' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'exports'
  );
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
  if (node.callee.type !== 'Super') {
    return false;
  }
  return node.arguments.some(isPropsReference);
}

/** Checks if a node is `props` (Identifier) or `this.props` (MemberExpression) */
function isPropsReference(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return node.name === 'props';
  }
  if (node.type === 'MemberExpression') {
    return (
      !node.computed &&
      node.object.type === 'ThisExpression' &&
      node.property.type === 'Identifier' &&
      node.property.name === 'props'
    );
  }
  return false;
}

/** Collects the child AST nodes of a given node for traversal */
function collectNodeChildren(value: unknown, children: TSESTree.Node[]): void {
  if (!value || typeof value !== 'object') {
    return;
  }
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

/** Returns the child nodes of a given node for traversal */
function getChildren(node: TSESTree.Node): TSESTree.Node[] {
  const children: TSESTree.Node[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    collectNodeChildren((node as unknown as Record<string, unknown>)[key], children);
  }
  return children;
}

function isNode(value: unknown): boolean {
  return typeof (value as TSESTree.Node).type === 'string';
}
