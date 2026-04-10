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

/**
 * Wrappers that do not inject props and therefore must never trigger
 * HOC-export suppression by themselves.
 *
 * React teams often export components through helper wrappers, but not every
 * wrapper behaves like a classic HOC that adds new props for the wrapped
 * component to consume.
 *
 * - `memo` is React's render-optimization wrapper. It tells React to skip a
 *   re-render when the parent passes the same props again, but it forwards the
 *   original props unchanged. In other words, `memo(MyComponent)` affects
 *   rendering behavior, not the component's prop shape.
 * - `observer` is the wrapper used by MobX, a state-management library that
 *   lets React components automatically react to changes in observable
 *   application state. It re-renders the component when observed MobX state
 *   changes, but it likewise forwards the caller-provided props as-is. It
 *   subscribes the component to observable data; it does not synthesize extra
 *   props like `theme` or `classes`.
 *
 * Because neither wrapper contributes new props, suppressing S6767 for a
 * directly exported `memo(...)` or `observer(...)` component would hide genuine
 * unused-prop findings.
 */
const NON_INJECTING_HOC_WRAPPERS = new Set(['memo', 'observer']);

/**
 * Wrappers whose injected props are stable and known up front, so the
 * suppression can stay narrow and prop-specific.
 *
 * These wrappers are safer than generic data-binding HOCs because they usually
 * add a small, framework-defined set of helper props regardless of the specific
 * component being wrapped.
 * They are also not all from one package: this list groups together common
 * React ecosystem conventions from styling, theming, and internationalization
 * libraries whose injected props are stable enough to recognize by wrapper name.
 *
 * - `withStyles` is commonly used by styling libraries to compute CSS class
 *   names from a style definition and pass them to the component as a `classes`
 *   prop. A well-known example is Material UI / MUI.
 * - `withTheme` gives the component access to the current visual theme
 *   configuration, typically through a `theme` prop. Variants of this wrapper
 *   appear in theming systems such as Material UI / MUI and styled-components.
 * - `withTranslation` is used by internationalization libraries to provide
 *   translation helpers. The stable injected props are typically:
 *   `t` for looking up localized strings, `i18n` for the translation service
 *   instance, and sometimes `tReady` to indicate that translation resources
 *   have finished loading. A common source is `react-i18next`.
 * - `withLocalization` from `@fluent/react` injects a stable `getString`
 *   helper used to resolve localized strings.
 *
 * Because these injected props are known in advance, we can suppress only those
 * prop names and still report genuinely unused component-specific props.
 */
const FIXED_INJECTED_PROPS_BY_HOC = new Map<string, ReadonlySet<string>>([
  ['withStyles', new Set(['classes'])],
  ['withTheme', new Set(['theme'])],
  ['withTranslation', new Set(['t', 'i18n', 'tReady'])],
  ['withLocalization', new Set(['getString'])],
]);
const EMPTY_INJECTED_PROPS = new Set<string>();

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

      const { data } = descriptor as { data?: Record<string, string> };
      const propName = data?.name;
      if (!propName) {
        context.report(descriptor);
        return;
      }

      // Second suppression layer: the specific reported prop is referenced
      // inside a forwardRef callback.
      if (hasPropReferenceInForwardRefCallback(context.sourceCode, componentNode, propName)) {
        return;
      }

      // Third suppression layer: a directly exported HOC contributes this specific
      // prop name from the fixed injected-prop whitelist.
      if (isPropInjectedByDirectlyExportedHoc(context.sourceCode, componentNode, propName)) {
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

type ProgramStatement = estree.Statement | estree.ModuleDeclaration;
type HocExportMetadata = Map<string, Set<string>>;
type HocApplicationMetadata = { componentName: string; injectedProps: Set<string> };
/** Per-file cache of directly exported components and the specific props injected into them. */
const perSourceHocExportCache = new WeakMap<SourceCode, HocExportMetadata>();

/**
 * Returns true only when the reported component is wrapped in a directly exported
 * HOC chain and that chain is known to inject the reported prop name.
 *
 * `componentNode` is the enclosing React component found for the reported prop.
 * This helper resolves that component's identifier and then checks direct export
 * forms such as:
 * export default withStyles(styles)(MyComponent)
 * export const Wrapped = memo(withTheme(MyComponent))
 */
function isPropInjectedByDirectlyExportedHoc(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  const componentName = getComponentIdentifierFromNode(componentNode);
  if (!componentName) {
    return false;
  }

  return getHocExportCache(sourceCode).get(componentName)?.has(propName) ?? false;
}

/** Lazily computes per-file HOC export metadata and reuses it across reported issues. */
function getHocExportCache(sourceCode: SourceCode): HocExportMetadata {
  let hocExportCache = perSourceHocExportCache.get(sourceCode);
  if (!hocExportCache) {
    hocExportCache = buildHocExportCache(sourceCode.ast.body);
    perSourceHocExportCache.set(sourceCode, hocExportCache);
  }
  return hocExportCache;
}

/** Collects directly exported components and the fixed injected props contributed by their HOCs. */
function buildHocExportCache(body: ProgramStatement[]): HocExportMetadata {
  const exportedComponents = new Map<string, Set<string>>();

  for (const stmt of body) {
    for (const { componentName, injectedProps } of getDirectHocExportMetadataFromStatement(stmt)) {
      let existing = exportedComponents.get(componentName);
      if (!existing) {
        existing = new Set<string>();
        exportedComponents.set(componentName, existing);
      }
      for (const prop of injectedProps) {
        existing.add(prop);
      }
    }
  }

  return exportedComponents;
}

/**
 * Collects directly HOC-exported component metadata contributed by a single statement.
 *
 * Pseudo-code examples:
 * export default withStyles(styles)(MyComponent);
 * export const Wrapped = withTheme(MyComponent);
 * module.exports = memo(withTranslation()(MyComponent));
 */
function getDirectHocExportMetadataFromStatement(stmt: ProgramStatement): HocApplicationMetadata[] {
  return [
    ...getDirectHocExportMetadataFromDefaultExport(stmt),
    ...getDirectHocExportMetadataFromNamedExport(stmt),
    ...getDirectHocExportMetadataFromModuleExports(stmt),
  ];
}

/**
 * Extracts the wrapped component metadata from a direct default export.
 *
 * Pseudo-code example:
 * export default withStyles(styles)(MyComponent);
 */
function getDirectHocExportMetadataFromDefaultExport(
  stmt: ProgramStatement,
): HocApplicationMetadata[] {
  if (stmt.type !== 'ExportDefaultDeclaration' || stmt.declaration.type !== 'CallExpression') {
    return [];
  }

  const metadata = getHocApplicationMetadata(stmt.declaration);
  return metadata ? [metadata] : [];
}

/**
 * Extracts wrapped component metadata from a named export declaration.
 *
 * Pseudo-code example:
 * export const Wrapped = withTheme(MyComponent);
 */
function getDirectHocExportMetadataFromNamedExport(
  stmt: ProgramStatement,
): HocApplicationMetadata[] {
  if (stmt.type !== 'ExportNamedDeclaration' || stmt.declaration?.type !== 'VariableDeclaration') {
    return [];
  }

  const wrappedComponents: HocApplicationMetadata[] = [];
  for (const declarator of stmt.declaration.declarations) {
    if (declarator.init?.type === 'CallExpression') {
      const metadata = getHocApplicationMetadata(declarator.init);
      if (metadata) {
        wrappedComponents.push(metadata);
      }
    }
  }
  return wrappedComponents;
}

/**
 * Extracts wrapped component metadata from a CommonJS export assignment.
 *
 * Pseudo-code example:
 * module.exports = withStyles(styles)(MyComponent);
 */
function getDirectHocExportMetadataFromModuleExports(
  stmt: ProgramStatement,
): HocApplicationMetadata[] {
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

  const metadata = getHocApplicationMetadata(right);
  return metadata ? [metadata] : [];
}

/**
 * Recovers the wrapped component name and all whitelisted injected props from a
 * direct HOC application chain.
 *
 * Pseudo-code examples:
 * withStyles(styles)(MyComponent)          -> { componentName: 'MyComponent', injectedProps: ['classes'] }
 * memo(withTheme(MyComponent))             -> { componentName: 'MyComponent', injectedProps: ['theme'] }
 * connect(mapState)(MyComponent)           -> { componentName: 'MyComponent', injectedProps: [] }
 */
function getHocApplicationMetadata(call: estree.CallExpression): HocApplicationMetadata | null {
  const wrappedValue = call.arguments[0];
  if (!wrappedValue || wrappedValue.type === 'SpreadElement') {
    return null;
  }

  let metadata: HocApplicationMetadata | null = null;
  if (wrappedValue.type === 'Identifier' && /^[A-Z]/.test(wrappedValue.name)) {
    metadata = { componentName: wrappedValue.name, injectedProps: new Set<string>() };
  } else if (wrappedValue.type === 'CallExpression') {
    metadata = getHocApplicationMetadata(wrappedValue);
  }

  if (!metadata) {
    return null;
  }

  const wrapperName = getHocWrapperName(call);
  if (!wrapperName) {
    return metadata;
  }

  for (const injectedProp of getInjectedPropsForHocWrapper(wrapperName)) {
    metadata.injectedProps.add(injectedProp);
  }

  return metadata;
}

/** Resolves the wrapper name from single-call and curried-call HOC forms. */
function getHocWrapperName(call: estree.CallExpression): string | null {
  let callee: estree.Expression | estree.Super = call.callee;
  while (callee.type === 'CallExpression') {
    callee = callee.callee;
  }

  if (callee.type === 'Identifier') {
    return callee.name;
  }

  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name;
  }

  return null;
}

/** Returns the fixed injected props for a wrapper, or none for blacklisted/unknown wrappers. */
function getInjectedPropsForHocWrapper(wrapperName: string): ReadonlySet<string> {
  if (NON_INJECTING_HOC_WRAPPERS.has(wrapperName)) {
    return EMPTY_INJECTED_PROPS;
  }
  return FIXED_INJECTED_PROPS_BY_HOC.get(wrapperName) ?? EMPTY_INJECTED_PROPS;
}
