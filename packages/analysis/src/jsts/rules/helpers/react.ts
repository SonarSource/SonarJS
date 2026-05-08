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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { childrenOf, getNodeParent } from './ancestor.js';
import { isIdentifier } from './ast.js';
import { getFullyQualifiedName } from './module.js';
import { isRequiredParserServices, type RequiredParserServices } from './parser-services.js';
import {
  areMutuallyAssignableTypes,
  areSameTypeDeclarations,
  getTypeFromTreeNode,
} from './type.js';

const COMPONENT_NODE_TYPES = new Set([
  'ClassDeclaration',
  'ClassExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const TS_TYPE_DECL_TYPES = new Set(['TSInterfaceDeclaration', 'TSTypeAliasDeclaration']);
type SourceCache = {
  componentNodes: estree.Node[] | undefined;
  ownerByTypeDecl: WeakMap<estree.Node, estree.Node | null>;
  reactNonPropsTypeDecl: WeakMap<estree.Node, boolean>;
};
const perSourceCache = new WeakMap<SourceCode, SourceCache>();
const REACT_CLASS_SUPERS = new Set(['react.Component', 'react.PureComponent']);

/**
 * Given a reported AST node (e.g., a prop name inside an interface/propTypes),
 * returns the React component node that owns it, or `undefined` if no owner can be identified.
 *
 * Uses three strategies:
 * - Walk ancestors for a direct component ancestor.
 * - Walk ancestors for a `Foo.propTypes = {...}` assignment and resolve `Foo`'s declaration.
 * - Use the TypeScript type checker to match the props interface to its owning
 *   class or function component (identified by PascalCase convention).
 *
 * Returns `undefined` if all strategies fail so callers can keep the original report
 * instead of falling back to a file-wide scan.
 *
 * @param node the reported node located inside a React-related construct
 * @param context the current ESLint rule context
 * @returns the component node that owns `node`, if it can be resolved
 */
export function findComponentNode(
  node: estree.Node,
  context: Rule.RuleContext,
): estree.Node | undefined {
  const ancestors = context.sourceCode.getAncestors(node);

  // Strategy A: direct component ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (COMPONENT_NODE_TYPES.has(ancestors[i].type)) {
      return ancestors[i];
    }
  }

  // Strategy B: Foo.propTypes = {...} assignment ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i];
    if (anc.type !== 'AssignmentExpression') {
      continue;
    }
    const { left } = anc;
    if (
      left.type === 'MemberExpression' &&
      isIdentifier(left.property, 'propTypes') &&
      left.object.type === 'Identifier'
    ) {
      const name = left.object.name;
      const defNode = context.sourceCode.getScope(node).variables.find(v => v.name === name)
        ?.defs[0]?.node;
      if (defNode) {
        return defNode;
      }
    }
  }

  // Strategy C: TypeScript type checker — match the props interface to its owning component
  return findOwnerByType(ancestors, context, context.sourceCode.visitorKeys);
}

/**
 * Resolves the ESLint scope variable corresponding to a React component node.
 *
 * The helper first derives the component identifier from its declaration form
 * (`function Foo()`, `class Foo extends ...`, `const Foo = () => ...`, etc.),
 * then walks the enclosing scope chain until it finds the matching variable.
 *
 * @param sourceCode the source file whose scope manager should be queried
 * @param componentNode the component node whose variable should be resolved
 * @returns the matching scope variable, or `undefined` for anonymous/unresolved components
 */
export function getComponentVariable(
  sourceCode: SourceCode,
  componentNode: estree.Node,
): Scope.Variable | undefined {
  const componentIdentifier = getComponentIdentifier(componentNode);
  if (!componentIdentifier) {
    return undefined;
  }

  let scope: Scope.Scope | null = sourceCode.getScope(componentNode);
  while (scope) {
    const variable = scope.set.get(componentIdentifier.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }

  return undefined;
}

/**
 * Resolves the declared props type for a React component node.
 *
 * For function components, this is the type of the first parameter. For class
 * components, the helper first prefers the explicit `React.Component<Props>`
 * type argument and falls back to the shared resolver for the `props` instance
 * property type.
 *
 * Returns `undefined` for unsupported nodes or when the component does not
 * expose a statically recoverable props type.
 *
 * @param componentNode the React component node whose props type should be resolved
 * @param services the required parser services used to access TypeScript type information
 * @returns the component props type, or `undefined` when it cannot be recovered
 */
export function getComponentPropsType(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type | undefined {
  const checker = services.program.getTypeChecker();
  if (
    componentNode.type === 'FunctionDeclaration' ||
    componentNode.type === 'FunctionExpression' ||
    componentNode.type === 'ArrowFunctionExpression'
  ) {
    const firstParam = componentNode.params[0];
    return firstParam ? getTypeFromTreeNode(firstParam, services) : undefined;
  }

  if (componentNode.type !== 'ClassDeclaration' && componentNode.type !== 'ClassExpression') {
    return undefined;
  }

  const tsNode = services.esTreeNodeToTSNodeMap.get(
    componentNode as TSESTree.Node,
  ) as ts.ClassLikeDeclaration;
  return getDeclaredClassPropsType(tsNode, checker) ?? getClassPropsPropertyType(tsNode, checker);
}

/**
 * Returns true when the reported node belongs to a TypeScript type declaration that is
 * used as a non-props generic argument of a React class component, such as:
 * - `React.Component<Props, State>`
 * - `React.Component<Props, State, Snapshot>`
 *
 * These declarations are not props contracts, so `react/no-unused-prop-types` reports
 * on them are false positives and should be suppressed conservatively.
 *
 * @param node the reported node located inside a TypeScript type declaration
 * @param context the current ESLint rule context
 * @returns `true` when the declaration is used as a non-props React class type
 */
export function isUsedAsReactComponentNonPropsType(
  node: estree.Node,
  context: Rule.RuleContext,
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  return isReactComponentNonPropsTypeDeclaration(
    ancestors,
    context,
    context.sourceCode.visitorKeys,
  );
}

/**
 * Returns true when an ESTree superclass expression resolves to one of React's
 * built-in component base classes.
 *
 * This recognizes imported aliases such as:
 * - `import { Component as BaseComponent } from 'react';`
 * - `import * as UI from 'react';`
 *
 * and preserves the existing syntax-based fallback for bare `Component` /
 * `PureComponent` and `React.Component` / `React.PureComponent`.
 *
 * @param context the current ESLint rule context, used to resolve imported aliases
 * @param superClass the ESTree superclass expression to inspect
 * @returns `true` when `superClass` denotes a React component base class
 */
export function isReactComponentSuperclass(
  context: Rule.RuleContext,
  superClass: estree.Expression,
): boolean {
  return (
    REACT_CLASS_SUPERS.has(getFullyQualifiedName(context, superClass) ?? '') ||
    isBuiltinReactSuperclass(superClass)
  );
}

/**
 * Returns true when an ESTree superclass expression syntactically refers to one of React's
 * built-in component base classes:
 * - `Component`
 * - `PureComponent`
 * - `React.Component`
 * - `React.PureComponent`
 *
 * Unlike `isReactComponentSuperclass`, this helper only inspects the syntax and
 * does not resolve imported aliases.
 *
 * @param superClass the ESTree superclass expression to inspect
 * @returns `true` when `superClass` syntactically denotes a React base class
 */
function isBuiltinReactSuperclass(superClass: estree.Expression): boolean {
  return (
    isIdentifier(superClass, 'Component') ||
    isIdentifier(superClass, 'PureComponent') ||
    (superClass.type === 'MemberExpression' &&
      isIdentifier(superClass.object, 'React') &&
      (isIdentifier(superClass.property, 'Component') ||
        isIdentifier(superClass.property, 'PureComponent')))
  );
}

/**
 * Returns true when a TypeScript heritage-clause entry refers to one of React's
 * built-in component base classes:
 * - `Component`
 * - `PureComponent`
 * - `React.Component`
 * - `React.PureComponent`
 *
 * @param superclass the TypeScript heritage-clause entry to inspect
 * @returns `true` when `superclass` denotes a React component base class
 */
function isReactComponentHeritageSuperclass(superclass: ts.ExpressionWithTypeArguments): boolean {
  const expression = superclass.expression;
  if (ts.isIdentifier(expression)) {
    return expression.text === 'Component' || expression.text === 'PureComponent';
  }
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'React' &&
    (expression.name.text === 'Component' || expression.name.text === 'PureComponent')
  );
}

/**
 * Returns true when a callee expression refers to React's `forwardRef`, either as
 * a bare identifier or as `React.forwardRef`.
 *
 * @param callee the ESTree callee expression to inspect
 * @returns `true` when `callee` denotes React's `forwardRef`
 */
export function isForwardRefCallee(callee: estree.Expression | estree.Super): boolean {
  return (
    isIdentifier(callee, 'forwardRef') ||
    (callee.type === 'MemberExpression' &&
      isIdentifier(callee.object, 'React') &&
      isIdentifier(callee.property, 'forwardRef'))
  );
}

function getDeclaredClassPropsType(
  classNode: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
): ts.Type | undefined {
  const extendsClause = classNode.heritageClauses?.find(
    clause => clause.token === ts.SyntaxKind.ExtendsKeyword,
  );
  const reactSuperclass = extendsClause?.types.find(type =>
    isReactComponentHeritageSuperclass(type),
  );
  const propsTypeNode = reactSuperclass?.typeArguments?.[0];
  return propsTypeNode ? checker.getTypeAtLocation(propsTypeNode) : undefined;
}

function getClassPropsPropertyType(
  classNode: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
): ts.Type | undefined {
  if (!classNode.name) {
    return undefined;
  }

  const classSymbol = checker.getSymbolAtLocation(classNode.name);
  const propsSymbol = classSymbol
    ? checker.getDeclaredTypeOfSymbol(classSymbol).getProperty('props')
    : undefined;
  return propsSymbol ? checker.getTypeOfSymbol(propsSymbol) : undefined;
}

function getDeclaredClassNonPropsTypes(
  classNode: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
): ts.Type[] {
  const extendsClause = classNode.heritageClauses?.find(
    clause => clause.token === ts.SyntaxKind.ExtendsKeyword,
  );
  const reactSuperclass = extendsClause?.types.find(type =>
    isReactComponentHeritageSuperclass(type),
  );
  return (
    reactSuperclass?.typeArguments
      ?.slice(1)
      .map(typeArgument => checker.getTypeAtLocation(typeArgument)) ?? []
  );
}

/**
 * Strategy C: use the TypeScript type checker to find which React component owns a given
 * props type declaration (`interface FooProps` or `type FooProps = ...`).
 *
 * The idea: the reported node is inside a TypeScript interface or type alias.  We resolve
 * that type with the TS checker, then scan every component node in the file and ask whether
 * its props parameter type is *mutually assignable* to the reported type.  Mutual assignability
 * (A ↔ B) is stricter than one-directional subtyping and avoids false matches such as an empty
 * or all-optional props type accidentally matching an unrelated state interface.
 *
 * Results are cached per source-file and per type-declaration node so the expensive
 * type-checker calls are only made once per unique `(file, typeDecl)` pair.
 *
 * @returns The component node that owns the props type, or `undefined` if no match is found.
 */
function findOwnerByType(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
  keys: SourceCode.VisitorKeys,
): estree.Node | undefined {
  // Strategy C requires TypeScript type information — bail out without it.
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return undefined;
  }

  // Step 1: locate the nearest enclosing TypeScript type declaration in the ancestor chain.
  // The reported node (e.g. a prop name) lives inside `interface FooProps { ... }` or
  // `type FooProps = { ... }` — we need that declaration node to look up its TS type.
  const typeDecl = findEnclosingTypeDeclaration(ancestors);
  if (!typeDecl) {
    // Not inside a type declaration — Strategy C cannot apply.
    return undefined;
  }

  // Step 2: check the per-file cache before doing any type-checker work.
  // `null` in the cache means "we already searched and found no owner".
  const sourceCache = getSourceCache(context.sourceCode);
  const cachedOwner = sourceCache.ownerByTypeDecl.get(typeDecl);
  if (cachedOwner !== undefined) {
    return cachedOwner ?? undefined; // convert null → undefined for callers
  }

  // Step 3: resolve the TS type for the type declaration (e.g. the shape of `FooProps`).
  const checker = services.program.getTypeChecker();
  const propsType = getTypeFromTreeNode(typeDecl, services);

  // Step 4: collect all top-level component nodes in the file (also cached).
  // We intentionally stop at component boundaries and do not recurse into their bodies,
  // because nested components are an antipattern and scanning them would be expensive.
  const componentNodes =
    sourceCache.componentNodes ??
    (sourceCache.componentNodes = collectComponentNodes(context.sourceCode.ast, keys));

  // Step 5: find the first component whose props type is mutually assignable to `propsType`.
  for (const componentNode of componentNodes) {
    const tsNode = services.esTreeNodeToTSNodeMap.get(
      componentNode as TSESTree.Node,
    ) as ts.Declaration;
    if (componentNode.type === 'ClassDeclaration' || componentNode.type === 'ClassExpression') {
      if (matchesClassProps(tsNode as ts.ClassLikeDeclaration, checker, propsType)) {
        sourceCache.ownerByTypeDecl.set(typeDecl, componentNode);
        return componentNode;
      }
    } else if (
      matchesFunctionProps(componentNode, tsNode as ts.SignatureDeclaration, checker, propsType)
    ) {
      sourceCache.ownerByTypeDecl.set(typeDecl, componentNode);
      return componentNode;
    }
  }

  // No component matched — record the negative result so we don't search again.
  sourceCache.ownerByTypeDecl.set(typeDecl, null);
  return undefined;
}

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      componentNodes: undefined,
      ownerByTypeDecl: new WeakMap<estree.Node, estree.Node | null>(),
      reactNonPropsTypeDecl: new WeakMap<estree.Node, boolean>(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

function isReactComponentNonPropsTypeDeclaration(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
  keys: SourceCode.VisitorKeys,
): boolean {
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return false;
  }

  const typeDecl = findEnclosingTypeDeclaration(ancestors);
  if (!typeDecl) {
    return false;
  }

  const sourceCache = getSourceCache(context.sourceCode);
  const cached = sourceCache.reactNonPropsTypeDecl.get(typeDecl);
  if (cached !== undefined) {
    return cached;
  }

  const checker = services.program.getTypeChecker();
  const candidateType = getTypeFromTreeNode(typeDecl, services);
  const componentNodes =
    sourceCache.componentNodes ??
    (sourceCache.componentNodes = collectComponentNodes(context.sourceCode.ast, keys));

  const isNonPropsType = componentNodes.some(componentNode => {
    if (componentNode.type !== 'ClassDeclaration' && componentNode.type !== 'ClassExpression') {
      return false;
    }

    const tsNode = services.esTreeNodeToTSNodeMap.get(
      componentNode as TSESTree.Node,
    ) as ts.ClassLikeDeclaration;
    return getDeclaredClassNonPropsTypes(tsNode, checker).some(nonPropsType =>
      areSameTypeDeclarations(checker, candidateType, nonPropsType),
    );
  });

  sourceCache.reactNonPropsTypeDecl.set(typeDecl, isNonPropsType);
  return isNonPropsType;
}

function findEnclosingTypeDeclaration(ancestors: estree.Node[]): estree.Node | undefined {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (TS_TYPE_DECL_TYPES.has(ancestors[i].type)) {
      return ancestors[i];
    }
  }
  return undefined;
}

/**
 * Performs a shallow AST walk from `root` and returns every top-level component node
 * (`ClassDeclaration`, `ClassExpression`, `FunctionDeclaration`, `FunctionExpression`,
 * `ArrowFunctionExpression`).
 *
 * "Shallow" means the walk **stops** when it reaches a component node — it does not
 * recurse into the component's body.  This is intentional: nested component definitions
 * are an antipattern in React, and skipping their bodies keeps the traversal bounded.
 * The children are pushed in reverse order so that the leftmost child is processed first
 * (stack is LIFO), preserving document order in the result array.
 */
function collectComponentNodes(root: estree.Node, keys: SourceCode.VisitorKeys): estree.Node[] {
  const result: estree.Node[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (COMPONENT_NODE_TYPES.has(node.type)) {
      result.push(node);
      continue; // don't recurse into component bodies — nested components are an antipattern
    }
    const children = childrenOf(node, keys);
    // Push in reverse so the first child is on top and processed next (preserves order).
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return result;
}

/**
 * Returns `true` when the class component's declared `props` property type is mutually
 * assignable to `propsType`.
 *
 * For Strategy C owner matching, we intentionally key off the resolved instance
 * `props` property instead of the heritage-clause type argument alone. That keeps
 * abstract or intermediate base classes from stealing ownership from subclasses
 * that are the actual components using the props inside the file.
 *
 * **Why mutual assignability?**
 * One-directional assignability (`propsType → componentPropsType`) would return `true`
 * whenever `propsType` is a structural subtype of `componentPropsType`, which is
 * trivially satisfied when the component's props interface has only optional fields.
 * Requiring the reverse direction as well (`componentPropsType → propsType`) filters
 * out unrelated interfaces that happen to satisfy a permissive props shape.
 */
function matchesClassProps(
  cls: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
  propsType: ts.Type,
): boolean {
  return areMutuallyAssignableTypes(checker, propsType, getClassPropsPropertyType(cls, checker));
}

/**
 * Returns `true` when the function component's first parameter type is mutually
 * assignable to `propsType`.
 *
 * For a function component `function Foo(props: FooProps)`, we inspect the type of
 * its first parameter via the TypeScript checker and compare it with the candidate
 * `propsType`.
 *
 * **PascalCase guard:** React components are conventionally PascalCase.  If the function
 * has a resolvable name that starts with a lowercase letter, it is almost certainly a
 * helper (e.g. `getStyle(props)`) rather than a component — skip it to avoid false
 * matches.  Unnamed functions (e.g. anonymous arrow functions) are not filtered out
 * because they could still be valid component expressions assigned to a PascalCase
 * variable.
 *
 * **Why mutual assignability?** — same rationale as `matchesClassProps`: prevents
 * accidental matches when the component's props type is permissive (all-optional fields).
 */
function matchesFunctionProps(
  componentNode: estree.Node,
  tsFuncNode: ts.SignatureDeclaration,
  checker: ts.TypeChecker,
  propsType: ts.Type,
): boolean {
  // Skip non-PascalCase names to avoid matching helper functions
  // that happen to accept the same props type (React components use PascalCase by convention).
  const funcName = getFunctionName(componentNode);
  if (funcName !== undefined && !/^[A-Z]/.test(funcName)) {
    return false;
  }
  const signature = checker.getSignatureFromDeclaration(tsFuncNode);
  const firstParam = signature?.parameters[0];
  if (firstParam == null) {
    // Function has no parameters — cannot be a props-consuming component.
    return false;
  }
  const componentParamType = checker.getTypeOfSymbol(firstParam);
  return areMutuallyAssignableTypes(checker, propsType, componentParamType);
}

/**
 * Returns the name of a function/arrow-function node if it can be statically determined,
 * or `undefined` for anonymous functions.
 *
 * - `FunctionDeclaration` / `FunctionExpression`: use the node's own `id`.
 * - `ArrowFunctionExpression`: look at the parent `VariableDeclarator` (e.g. `const Foo = () => …`).
 */
function getFunctionName(node: estree.Node): string | undefined {
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    return (node as estree.Function as { id?: estree.Identifier }).id?.name;
  }
  if (node.type === 'ArrowFunctionExpression') {
    const parent = (node as TSESTree.ArrowFunctionExpression).parent;
    if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
      return parent.id.name;
    }
  }
  return undefined;
}

function getComponentIdentifier(componentNode: estree.Node): estree.Identifier | undefined {
  const parent = getNodeParent(componentNode);
  if (
    (componentNode.type === 'ClassExpression' || componentNode.type === 'FunctionExpression') &&
    parent?.type === 'VariableDeclarator' &&
    parent.id.type === 'Identifier'
  ) {
    return parent.id;
  }

  if (
    (componentNode.type === 'ClassDeclaration' ||
      componentNode.type === 'FunctionDeclaration' ||
      componentNode.type === 'ClassExpression' ||
      componentNode.type === 'FunctionExpression') &&
    componentNode.id
  ) {
    return componentNode.id;
  }

  return parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier'
    ? parent.id
    : undefined;
}
