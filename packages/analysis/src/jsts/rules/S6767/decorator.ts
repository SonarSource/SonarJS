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

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import type { JSXSpreadAttribute } from 'estree-jsx';
import { childrenOf, getNodeParent } from '../helpers/ancestor.js';
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { findOwningComponentNode, getComponentIdentifierFromNode } from '../helpers/react.js';
import * as meta from './generated-meta.js';

/** Composable pattern checkers — extend via Array.some() for future FP patterns. */
const propsArgPatterns: Array<(arg: estree.Node) => boolean> = [
  arg => isIdentifier(arg, 'props'),
  arg =>
    arg.type === 'MemberExpression' &&
    arg.object.type === 'ThisExpression' &&
    isIdentifier(arg.property, 'props'),
];

/** Composable callee checkers for forwardRef call detection. */
const forwardRefCalleePatterns: Array<(callee: estree.Expression | estree.Super) => boolean> = [
  callee => isIdentifier(callee, 'forwardRef'),
  callee =>
    callee.type === 'MemberExpression' &&
    isIdentifier(callee.object, 'React') &&
    isIdentifier(callee.property, 'forwardRef'),
];

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const { node } = descriptor as { node: estree.Node };
      // The React helper can resolve the owner syntactically, or via TypeScript type
      // information when the reported node comes from a props type declaration.
      const componentNode = findOwningComponentNode(node, context);

      // All false-positive suppressions depend on resolving the enclosing component.
      // If we cannot find it, fall back to the upstream report.
      if (!componentNode) {
        context.report(descriptor);
        return;
      }

      // First suppression layer: the component uses the props object opaquely
      // (whole-object delegation, JSX spread, or computed access).
      if (hasOpaquePropsUsage(context.sourceCode, componentNode)) {
        return;
      }

      // Second suppression layer: the specific reported prop is referenced
      // inside a forwardRef callback.
      const { data } = descriptor as { data?: Record<string, string> };
      const propName = data?.name;
      if (
        propName &&
        hasPropReferenceInForwardRefCallback(context.sourceCode, componentNode, propName)
      ) {
        return;
      }

      // Third suppression layer: the component is wrapped in an HOC and exported.
      if (isComponentExportedViaHoc(context.sourceCode, componentNode)) {
        return;
      }

      context.report(descriptor);
    },
  );
}

/**
 * `componentNode` is the enclosing React component function found for the reported prop,
 * not the nested forwardRef callback itself.
 *
 * Returns true only when `propName` is referenced through that component function's
 * first parameter binding and the matching member access sits inside a forwardRef callback.
 *
 * Pseudo-code example:
 * function Wrapper(props) {
 *   const Forwarded = React.forwardRef((_, ref) => <div>{props.label}</div>);
 *   return <Forwarded />;
 * }
 */
function hasPropReferenceInForwardRefCallback(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  if (!isFunctionNode(componentNode)) {
    return false;
  }

  const propsParam = componentNode.params[0];
  if (!isIdentifier(propsParam)) {
    return false;
  }

  const variable = sourceCode.getScope(componentNode).set.get(propsParam.name);
  if (!variable) {
    return false;
  }

  return variable.references.some(reference =>
    isPropReferenceInForwardRefCallback(reference, propName),
  );
}

/**
 * Returns true when a single scope reference corresponds to `props.<propName>`
 * and that member access is located inside a forwardRef render callback.
 */
function isPropReferenceInForwardRefCallback(
  reference: Scope.Reference,
  propName: string,
): boolean {
  const memberExpression = getNodeParent(reference.identifier);
  if (
    memberExpression?.type !== 'MemberExpression' ||
    memberExpression.object !== reference.identifier ||
    memberExpression.computed ||
    !isIdentifier(memberExpression.property, propName)
  ) {
    return false;
  }

  // Walk up ancestors. Track `prev` so that when we find a forwardRef CallExpression
  // we can confirm the reference sits inside its first argument (the render callback),
  // not in the callee position or a later argument.
  let prev: estree.Node = memberExpression;
  let current: estree.Node | undefined = getNodeParent(memberExpression);
  while (current) {
    if (current.type === 'CallExpression') {
      const call = current;
      if (
        forwardRefCalleePatterns.some(pattern => pattern(call.callee)) &&
        call.arguments[0] === prev
      ) {
        return true;
      }
    }
    prev = current;
    current = getNodeParent(current);
  }
  return false;
}

/**
 * Returns true when the component uses the props object in an opaque way that the
 * upstream rule may not reliably attribute to an individual prop.
 *
 * Pseudo-code examples:
 * helper(props);
 * <Child {...props} />;
 * props[key];
 */
function hasOpaquePropsUsage(sourceCode: SourceCode, componentNode: estree.Node): boolean {
  return hasOpaquePropsUsageInSubtree(componentNode, sourceCode.visitorKeys);
}

/**
 * Recursively searches a subtree for whole-props delegation patterns that the
 * upstream rule does not reliably map back to an individual prop.
 */
function hasOpaquePropsUsageInSubtree(root: estree.Node, keys: SourceCode.VisitorKeys): boolean {
  if (!root) {
    return false;
  }

  // Check if this is a CallExpression with props as argument
  if (
    root.type === 'CallExpression' &&
    root.callee.type !== 'Super' &&
    !isPropTypesCheckCall(root) &&
    root.arguments.some(a => propsArgPatterns.some(p => p(a)))
  ) {
    return true;
  }

  // Check if this is a SpreadElement with props (for {...props} in JSX)
  if (root.type === 'SpreadElement' && propsArgPatterns.some(p => p(root.argument))) {
    return true;
  }

  // Check if this is a JSXSpreadAttribute with props (for {...props} or {...this.props} in JSX elements)
  if (
    root.type === 'JSXSpreadAttribute' &&
    propsArgPatterns.some(p => p((root as unknown as JSXSpreadAttribute).argument))
  ) {
    return true;
  }

  // Check if this is a computed MemberExpression with props (for props[key] or this.props[key])
  if (
    root.type === 'MemberExpression' &&
    root.computed &&
    propsArgPatterns.some(p => p(root.object))
  ) {
    return true;
  }

  // Recursively check all children
  return childrenOf(root, keys).some(child => hasOpaquePropsUsageInSubtree(child, keys));
}

/** Excludes PropTypes.checkPropTypes(...) from the generic call-based suppression. */
function isPropTypesCheckCall(call: estree.CallExpression): boolean {
  return (
    call.callee.type === 'MemberExpression' &&
    isIdentifier(call.callee.object, 'PropTypes') &&
    isIdentifier(call.callee.property, 'checkPropTypes')
  );
}

/**
 * Extracts the wrapped component name from a direct HOC application call.
 * Callers always pass the outer exported CallExpression, so for curried HOCs like
 * connect(mapState)(MyComponent) the first argument is already `MyComponent`.
 * Single HOCs like withRouter(MyComponent) follow the same shape.
 */
function getHocWrappedComponentName(call: estree.CallExpression): string | null {
  const arg = call.arguments[0];
  if (!arg || arg.type === 'SpreadElement') {
    return null;
  }
  if (arg.type === 'Identifier' && /^[A-Z]/.test(arg.name)) {
    return arg.name;
  }
  return null;
}

type ProgramStatement = estree.Statement | estree.ModuleDeclaration;
type HocExportCache = Set<string>;
/** Per-file cache of component names exported directly via an HOC. */
const perSourceHocExportCache = new WeakMap<SourceCode, HocExportCache>();

/**
 * Returns true when the reported component is wrapped in an HOC and that wrapped
 * value is exported from the file.
 *
 * `componentNode` is the enclosing React component found for the reported prop.
 * This helper resolves that component's identifier and then checks direct
 * export forms such as:
 * export default connect(...)(MyComponent)
 * export const Wrapped = withRouter(MyComponent)
 */
function isComponentExportedViaHoc(sourceCode: SourceCode, componentNode: estree.Node): boolean {
  const componentName = getComponentIdentifierFromNode(componentNode);
  if (!componentName) {
    return false;
  }

  const hocExportCache = getHocExportCache(sourceCode);
  return hocExportCache.has(componentName);
}

/** Lazily computes per-file HOC export metadata and reuses it across reported issues. */
function getHocExportCache(sourceCode: SourceCode): HocExportCache {
  let hocExportCache = perSourceHocExportCache.get(sourceCode);
  if (!hocExportCache) {
    hocExportCache = buildHocExportCache(sourceCode.ast.body);
    perSourceHocExportCache.set(sourceCode, hocExportCache);
  }
  return hocExportCache;
}

/** Collects component names that are wrapped by an HOC directly in an export statement. */
function buildHocExportCache(body: ProgramStatement[]): HocExportCache {
  const exportedComponentNames = new Set<string>();

  for (const stmt of body) {
    for (const wrappedComponentName of getDirectHocExportedComponentNamesFromStatement(stmt)) {
      exportedComponentNames.add(wrappedComponentName);
    }
  }

  return exportedComponentNames;
}

/**
 * Collects directly HOC-exported component names contributed by a single statement.
 *
 * Pseudo-code examples:
 * export default hoc(MyComponent);
 * export const Wrapped = hoc(MyComponent);
 * module.exports = hoc(MyComponent);
 */
function getDirectHocExportedComponentNamesFromStatement(stmt: ProgramStatement): string[] {
  return [
    ...getDirectHocExportedComponentNamesFromDefaultExport(stmt),
    ...getDirectHocExportedComponentNamesFromNamedExport(stmt),
    ...getDirectHocExportedComponentNamesFromModuleExports(stmt),
  ];
}

/**
 * Extracts the wrapped component name from a direct default export.
 *
 * Pseudo-code example:
 * export default hoc(MyComponent);
 */
function getDirectHocExportedComponentNamesFromDefaultExport(stmt: ProgramStatement): string[] {
  if (stmt.type !== 'ExportDefaultDeclaration' || stmt.declaration.type !== 'CallExpression') {
    return [];
  }

  const wrappedComponentName = getHocWrappedComponentName(stmt.declaration);
  return wrappedComponentName ? [wrappedComponentName] : [];
}

/**
 * Extracts wrapped component names from a named export declaration.
 *
 * Pseudo-code example:
 * export const Wrapped = hoc(MyComponent);
 */
function getDirectHocExportedComponentNamesFromNamedExport(stmt: ProgramStatement): string[] {
  if (stmt.type !== 'ExportNamedDeclaration' || stmt.declaration?.type !== 'VariableDeclaration') {
    return [];
  }

  const wrappedComponentNames: string[] = [];
  for (const declarator of stmt.declaration.declarations) {
    if (declarator.init?.type === 'CallExpression') {
      const wrappedComponentName = getHocWrappedComponentName(declarator.init);
      if (wrappedComponentName) {
        wrappedComponentNames.push(wrappedComponentName);
      }
    }
  }
  return wrappedComponentNames;
}

/**
 * Extracts the wrapped component name from a CommonJS export assignment.
 *
 * Pseudo-code example:
 * module.exports = hoc(MyComponent);
 */
function getDirectHocExportedComponentNamesFromModuleExports(stmt: ProgramStatement): string[] {
  if (stmt.type !== 'ExpressionStatement' || stmt.expression.type !== 'AssignmentExpression') {
    return [];
  }

  const { left, right } = stmt.expression;
  if (
    left.type !== 'MemberExpression' ||
    !isIdentifier(left.object, 'module') ||
    !isIdentifier(left.property, 'exports') ||
    right.type !== 'CallExpression'
  ) {
    return [];
  }

  const wrappedComponentName = getHocWrappedComponentName(right);
  return wrappedComponentName ? [wrappedComponentName] : [];
}
