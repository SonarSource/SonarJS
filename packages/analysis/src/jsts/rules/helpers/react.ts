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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type ts from 'typescript';
import { childrenOf } from './ancestor.js';
import { isIdentifier } from './ast.js';
import { isRequiredParserServices } from './parser-services.js';
import { getTypeFromTreeNode } from './type.js';

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
};
const perSourceCache = new WeakMap<SourceCode, SourceCache>();

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      componentNodes: undefined,
      ownerByTypeDecl: new WeakMap<estree.Node, estree.Node | null>(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

/**
 * Given a reported AST node (e.g., a prop name inside an interface/propTypes),
 * returns the React component node that owns it, or `undefined` if no owner can be identified.
 *
 * Uses three strategies:
 *   A. Walk ancestors for a direct component ancestor.
 *   B. Walk ancestors for a `Foo.propTypes = {...}` assignment; resolve Foo's declaration.
 *   C. Use the TypeScript type checker to match the props interface to its owning
 *      class or function component (identified by PascalCase convention).
 *
 * Returns `undefined` if all strategies fail — callers should pass the report through
 * without suppression rather than falling back to a file-wide scan.
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
        return defNode as estree.Node;
      }
    }
  }

  // Strategy C: TypeScript type checker — match the props interface to its owning component
  return findOwnerByType(ancestors, context, context.sourceCode.visitorKeys);
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
  let typeDecl: estree.Node | undefined;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (TS_TYPE_DECL_TYPES.has(ancestors[i].type)) {
      typeDecl = ancestors[i];
      break;
    }
  }
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

/**
 * Returns `true` when the class component's declared `props` property type is mutually
 * assignable to `propsType`.
 *
 * For a class component `class Foo extends React.Component<FooProps>`, TypeScript
 * exposes the props via the instance property `this.props`.  We resolve that property's
 * type from the class symbol and compare it with the candidate `propsType`.
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
  if (!cls.name) {
    return false;
  }
  const classSymbol = checker.getSymbolAtLocation(cls.name);
  if (!classSymbol) {
    return false;
  }
  // Obtain the instance type (the shape of `new Foo()`) to read its `props` property.
  const instanceType = checker.getDeclaredTypeOfSymbol(classSymbol);
  const propsSymbol = instanceType.getProperty('props');
  if (propsSymbol) {
    const componentPropsType = checker.getTypeOfSymbol(propsSymbol);
    // @ts-ignore — isTypeAssignableTo is a private TypeScript API
    return (
      checker.isTypeAssignableTo(propsType, componentPropsType) &&
      checker.isTypeAssignableTo(componentPropsType, propsType)
    );
  }
  // Fallback: when the base class is unresolved (e.g. `declare const React: any`),
  // TypeScript cannot expose the inherited `props` property via the instance type.
  // Instead, check if the first type argument of any heritage clause is mutually
  // assignable with `propsType` (e.g. `class Foo extends React.Component<FooProps>`).
  for (const clause of cls.heritageClauses ?? []) {
    for (const type of clause.types) {
      const typeArgs = type.typeArguments;
      if (!typeArgs || typeArgs.length === 0) {
        continue;
      }
      const firstArgType = checker.getTypeAtLocation(typeArgs[0]);
      // @ts-ignore — isTypeAssignableTo is a private TypeScript API
      if (
        checker.isTypeAssignableTo(propsType, firstArgType) &&
        checker.isTypeAssignableTo(firstArgType, propsType)
      ) {
        return true;
      }
    }
  }
  return false;
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
  // @ts-ignore — isTypeAssignableTo is a private TypeScript API
  return (
    checker.isTypeAssignableTo(propsType, componentParamType) &&
    checker.isTypeAssignableTo(componentParamType, propsType)
  );
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
