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
  getReportedEnclosingType,
  ReportedTypeDetails,
  type ReportedEnclosingType,
} from './reported-type.js';
import { areMutuallyAssignableTypes, getTypeFromTreeNode } from './type.js';

type TypeMemberNode = TSESTree.TSPropertySignature | TSESTree.TSMethodSignature;
type ReportedTypeMember = ReportedTypeDetails<TypeMemberNode, ts.TypeElement>;
type SourceCache = {
  componentNodes: estree.Node[] | undefined;
  ownersByReportNode: WeakMap<estree.Node, estree.Node[] | null>;
};

const COMPONENT_NODE_TYPES = new Set([
  'ClassDeclaration',
  'ClassExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const REACT_QUALIFIED_CLASS_SUPERS = new Set(['react.Component', 'react.PureComponent']);
const REACT_LOCAL_CLASS_SUPERS = new Set(['Component', 'PureComponent']);
const REACT_FUNCTION_COMPONENT_TYPES = new Set(['FC', 'FunctionComponent']);
const REACT_FORWARD_REF_RENDER_FUNCTION_TYPES = new Set(['ForwardRefRenderFunction']);

const perSourceCache = new WeakMap<SourceCode, SourceCache>();

export function isClassComponentNode(
  node: estree.Node,
): node is estree.ClassDeclaration | estree.ClassExpression {
  return node.type === 'ClassDeclaration' || node.type === 'ClassExpression';
}

export function isFunctionComponentNode(
  node: estree.Node,
): node is estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

export function hasIdentifierId(
  node: estree.Node,
): node is estree.Node & { id: estree.Identifier } {
  return 'id' in node && node.id != null && isIdentifier(node.id);
}

function getClassComponentTsNode(
  componentNode: estree.ClassDeclaration | estree.ClassExpression,
  services: RequiredParserServices,
): ts.ClassLikeDeclaration {
  return services.esTreeNodeToTSNodeMap.get(
    componentNode as TSESTree.Node,
  ) as ts.ClassLikeDeclaration;
}

export function isVariableDeclaratorWithIdentifierId(
  node: unknown,
): node is estree.VariableDeclarator & { id: estree.Identifier } {
  return (
    !!node &&
    typeof node === 'object' &&
    'type' in node &&
    node.type === 'VariableDeclarator' &&
    'id' in node &&
    !!node.id &&
    typeof node.id === 'object' &&
    'type' in node.id &&
    node.id.type === 'Identifier'
  );
}

function isReactPropTypesAssignment(node: estree.Node): node is estree.AssignmentExpression & {
  left: estree.MemberExpression & { object: estree.Identifier };
} {
  return (
    node.type === 'AssignmentExpression' &&
    node.left.type === 'MemberExpression' &&
    isIdentifier(node.left.property, 'propTypes') &&
    node.left.object.type === 'Identifier'
  );
}

function isTypeMemberNode(node: TSESTree.Node): node is TypeMemberNode {
  return node.type === 'TSPropertySignature' || node.type === 'TSMethodSignature';
}

export function isVariableAssignedFunctionOrClassExpression(
  componentNode: estree.Node,
  parent: unknown,
): parent is estree.VariableDeclarator & { id: estree.Identifier } {
  return (
    (componentNode.type === 'ClassExpression' || componentNode.type === 'FunctionExpression') &&
    isVariableDeclaratorWithIdentifierId(parent)
  );
}

/**
 * Returns the React components that own a reported node.
 *
 * Example:
 * ```tsx
 * interface SharedProps {
 *   sharedValue: string;
 * }
 *
 * interface ChildProps extends SharedProps {
 *   title: string;
 * }
 *
 * const Child: React.FC<ChildProps> = props => <div>{props.title}</div>;
 * const Wrapper: React.FC<SharedProps> = props => <Child {...props} title="x" />;
 * ```
 *
 * A report raised on `sharedValue` inside `SharedProps` belongs to both `Child` and `Wrapper`.
 * This helper returns both component nodes.
 *
 * It tries, in order:
 * - a direct enclosing component
 * - a `Foo.propTypes = { ... }` assignment
 * - TypeScript props-type matching
 *
 * @param node the reported node located inside a React-related construct
 * @param context the current ESLint rule context
 * @returns every component node that owns `node`
 */
export function findComponentNodes(node: estree.Node, context: Rule.RuleContext): estree.Node[] {
  const ancestors = context.sourceCode.getAncestors(node);

  // Strategy A: direct component ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (COMPONENT_NODE_TYPES.has(ancestors[i].type)) {
      return [ancestors[i]];
    }
  }

  // Strategy B: Foo.propTypes = {...} assignment ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i];
    if (!isReactPropTypesAssignment(anc)) {
      continue;
    }
    const name = anc.left.object.name;
    const defNode = context.sourceCode.getScope(node).variables.find(v => v.name === name)
      ?.defs[0]?.node;
    if (defNode) {
      return [defNode];
    }
  }

  // Strategy C: TypeScript type checker — match the props interface to its owning component
  return findComponentOwnersByType(node, ancestors, context, context.sourceCode.visitorKeys);
}

export function getReactComponentNodes(context: Rule.RuleContext): estree.Node[] {
  const sourceCache = getSourceCache(context.sourceCode);
  return (
    sourceCache.componentNodes ??
    (sourceCache.componentNodes = collectComponentNodes(
      context.sourceCode.ast,
      context.sourceCode.visitorKeys,
    ))
  );
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
 * property type. For typed function expressions assigned to variables, it also
 * falls back to the variable's declared React wrapper type when contextual
 * typing causes the parameter to resolve to `any` or `unknown`.
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
  if (isFunctionComponentNode(componentNode)) {
    const firstParam = componentNode.params[0];
    const propsType = firstParam ? getTypeFromTreeNode(firstParam, services) : undefined;
    if (isSpecificPropsType(propsType)) {
      return propsType;
    }
    return getComponentPropsTypeFromVariableDeclaration(componentNode, services);
  }

  if (!isClassComponentNode(componentNode)) {
    return undefined;
  }

  const tsNode = getClassComponentTsNode(componentNode, services);
  return getDeclaredClassPropsType(tsNode, checker) ?? getClassPropsPropertyType(tsNode, checker);
}

/**
 * Returns the props-type candidates for a component.
 *
 * Most components contribute one props type. Function expressions can contribute a
 * second one from the variable declaration when the parameter itself is not typed enough.
 *
 * Example:
 * ```tsx
 * const Button: React.FC<Props> = props => <button>{props.label}</button>;
 * ```
 *
 * In that case we look at both the parameter type and the declared `React.FC<Props>`.
 */
export function getComponentPropsTypeCandidates(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type[] {
  const propsTypes: ts.Type[] = [];
  const primaryPropsType = getComponentPropsType(componentNode, services);
  if (primaryPropsType) {
    propsTypes.push(primaryPropsType);
  }

  if (isFunctionComponentNode(componentNode)) {
    const declaredVariablePropsType = getComponentPropsTypeFromVariableDeclaration(
      componentNode,
      services,
    );
    if (declaredVariablePropsType && !propsTypes.includes(declaredVariablePropsType)) {
      propsTypes.push(declaredVariablePropsType);
    }
  }

  return propsTypes;
}

function isSpecificPropsType(type: ts.Type | undefined): type is ts.Type {
  return !!type && (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) === 0;
}

/**
 * Returns the props type declared on the variable that holds a function component.
 *
 * Example:
 * ```tsx
 * const Button: React.FC<Props> = props => <button>{props.label}</button>;
 * ```
 *
 * This reads `Props` from the variable declaration, not from the `props` parameter.
 */
function getComponentPropsTypeFromVariableDeclaration(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type | undefined {
  const parent = getNodeParent(componentNode);
  if (!isVariableDeclaratorWithIdentifierId(parent)) {
    return undefined;
  }

  const declaredType = (parent.id as TSESTree.Identifier).typeAnnotation?.typeAnnotation;
  if (!declaredType) {
    return undefined;
  }

  const propsTypeNode = findDeclaredFunctionComponentPropsType(declaredType);
  return propsTypeNode
    ? getTypeFromTreeNode(propsTypeNode as unknown as estree.Node, services)
    : undefined;
}

/**
 * Extracts the props type from a React function-component wrapper type.
 *
 * Examples:
 * ```tsx
 * const Foo: React.FC<Props> = props => <div />;
 * const Foo: React.FC<Props> & { Group?: string } = props => <div />;
 * const Foo: React.ForwardRefRenderFunction<HTMLInputElement, Props> = (props, ref) => <div />;
 * ```
 *
 * In each case this returns the `Props` node.
 */
function findDeclaredFunctionComponentPropsType(
  typeNode: TSESTree.TypeNode,
): TSESTree.TypeNode | undefined {
  if (typeNode.type === 'TSIntersectionType') {
    for (const type of typeNode.types) {
      const propsType = findDeclaredFunctionComponentPropsType(type);
      if (propsType) {
        return propsType;
      }
    }
    return undefined;
  }

  if (typeNode.type !== 'TSTypeReference') {
    return undefined;
  }

  const typeName = getRightmostTypeName(typeNode.typeName);
  const typeArguments = typeNode.typeArguments?.params ?? [];

  if (typeName && REACT_FUNCTION_COMPONENT_TYPES.has(typeName)) {
    return typeArguments[0];
  }

  if (typeName && REACT_FORWARD_REF_RENDER_FUNCTION_TYPES.has(typeName)) {
    return typeArguments[1];
  }

  return undefined;
}

function getRightmostTypeName(typeName: TSESTree.EntityName): string | undefined {
  if (typeName.type === 'Identifier') {
    return typeName.name;
  }
  if (typeName.type === 'TSQualifiedName') {
    return typeName.right.name;
  }
  return undefined;
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
    REACT_QUALIFIED_CLASS_SUPERS.has(getFullyQualifiedName(context, superClass) ?? '') ||
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
function isReactClassSuperName(name: string): boolean {
  return REACT_LOCAL_CLASS_SUPERS.has(name);
}

function isBuiltinReactSuperclass(superClass: estree.Expression): boolean {
  return (
    (superClass.type === 'Identifier' && isReactClassSuperName(superClass.name)) ||
    (superClass.type === 'MemberExpression' &&
      isIdentifier(superClass.object, 'React') &&
      superClass.property.type === 'Identifier' &&
      isReactClassSuperName(superClass.property.name))
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
    return isReactClassSuperName(expression.text);
  }
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'React' &&
    isReactClassSuperName(expression.name.text)
  );
}

/**
 * Returns true when a callee expression refers to React's `forwardRef`, either as
 * a bare identifier or as `React.forwardRef`.
 *
 * **Limitation:** this is a syntax-only check and does not resolve import aliases.
 * Calls such as `import { forwardRef as fwdRef } from 'react'; fwdRef(...)` are
 * intentionally left unmatched here.
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

/**
 * Returns the resolved type of the class instance's `props` property.
 *
 * This is the fallback for class components when the `extends React.Component<Props, ...>`
 * clause does not give us a usable props type directly. By reading the class symbol's
 * inherited `props` property, we can still recover the effective props type seen on `this.props`.
 */
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

export function getDeclaredClassNonPropsTypes(
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
 * TypeScript fallback for finding component owners.
 *
 * The reported node is inside a reported enclosing type that acts as a React props
 * type, such as
 * `interface FooProps { ... }` or `type FooProps = ...`.
 *
 * We scan the components in the file and keep the ones whose props match that
 * reported enclosing type declaration.
 * If the report is on a specific member such as `sharedValue`, we first try to match that
 * member. If that is not possible, we fall back to matching the whole reported
 * enclosing type.
 *
 * @returns Every component that owns the reported enclosing type. Returns an empty array when
 * no match is found.
 */
function findComponentOwnersByType(
  node: estree.Node,
  ancestors: estree.Node[],
  context: Rule.RuleContext,
  keys: SourceCode.VisitorKeys,
): estree.Node[] {
  // Strategy C requires TypeScript type information — bail out without it.
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return [];
  }

  // Step 1: reuse the cached result when we already computed it for this node.
  const sourceCache = getSourceCache(context.sourceCode);
  const cachedOwners = sourceCache.ownersByReportNode.get(node);
  if (cachedOwners !== undefined) {
    return cachedOwners ?? [];
  }

  const checker = services.program.getTypeChecker();

  // Step 2: collect the reported enclosing type details.
  const reportedEnclosingType = getReportedEnclosingType(ancestors, services, checker);
  if (!reportedEnclosingType) {
    return storeComponentOwnersByReportNode(sourceCache, node, []);
  }

  // Step 3: collect the components in the file.
  const componentNodes =
    sourceCache.componentNodes ??
    (sourceCache.componentNodes = collectComponentNodes(context.sourceCode.ast, keys));
  if (componentNodes.length === 0) {
    return storeComponentOwnersByReportNode(sourceCache, node, []);
  }

  // Step 4: if the report is on a specific type member such as `sharedValue`, keep only
  // the components whose props contain that member with an assignable type.
  const reportedTypeMember = getReportedTypeMember(ancestors, services, checker);
  if (reportedTypeMember) {
    return storeComponentOwnersByReportNode(
      sourceCache,
      node,
      findComponentOwnersByReportedTypeMember(
        componentNodes,
        services,
        checker,
        reportedEnclosingType,
        reportedTypeMember,
      ),
    );
  }

  // Step 5: otherwise, match the whole reported enclosing type.
  return storeComponentOwnersByReportNode(
    sourceCache,
    node,
    findComponentOwnersByReportedEnclosingType(
      componentNodes,
      services,
      checker,
      reportedEnclosingType,
    ),
  );
}

function storeComponentOwnersByReportNode(
  sourceCache: SourceCache,
  reportNode: estree.Node,
  owners: estree.Node[],
): estree.Node[] {
  sourceCache.ownersByReportNode.set(reportNode, owners.length > 0 ? owners : null);
  return owners;
}

function findComponentOwnersByReportedTypeMember(
  componentNodes: estree.Node[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedEnclosingType: ReportedEnclosingType,
  reportedTypeMember: ReportedTypeMember,
): estree.Node[] {
  return componentNodes.filter(componentNode =>
    componentPropsIncludeReportedTypeMember(
      componentNode,
      services,
      checker,
      reportedEnclosingType,
      reportedTypeMember,
    ),
  );
}

function findComponentOwnersByReportedEnclosingType(
  componentNodes: estree.Node[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedEnclosingType: ReportedEnclosingType,
): estree.Node[] {
  return componentNodes.filter(componentNode =>
    componentUsesReportedEnclosingType(componentNode, services, checker, reportedEnclosingType),
  );
}

function componentUsesReportedEnclosingType(
  componentNode: estree.Node,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedEnclosingType: ReportedEnclosingType,
): boolean {
  if (!isClassComponentNode(componentNode)) {
    return matchesFunctionProps(componentNode, services, checker, reportedEnclosingType.tsType);
  }

  if (!hasRenderMethodOrProperty(componentNode)) {
    return false;
  }

  return matchesClassProps(
    getClassComponentTsNode(componentNode, services),
    checker,
    reportedEnclosingType.tsType,
  );
}

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      componentNodes: undefined,
      ownersByReportNode: new WeakMap<estree.Node, estree.Node[] | null>(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

/**
 * Returns the closest enclosing TypeScript type member around a reported node.
 *
 * Example:
 * ```ts
 * interface Props {
 *   title: string;
 *   onSelect(): void;
 *   'data-id': string;
 *   0: string;
 * }
 * ```
 *
 * A report raised inside one of those members resolves to that property or method.
 */
function findEnclosingTypeMember(ancestors: estree.Node[]): TypeMemberNode | undefined {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i] as TSESTree.Node;
    if (isTypeMemberNode(ancestor)) {
      return ancestor;
    }
  }
  return undefined;
}

function getReportedTypeMember(
  ancestors: estree.Node[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
): ReportedTypeMember | undefined {
  const declaration = findEnclosingTypeMember(ancestors);
  return ReportedTypeDetails.fromDeclaration(
    declaration,
    getTypeMemberName(declaration),
    services,
    checker,
    ts.isTypeElement,
  );
}

export function isPascalCaseFunctionComponent(componentNode: estree.Node): boolean {
  const componentIdentifier = getComponentIdentifier(componentNode);
  return componentIdentifier !== undefined && /^[A-Z]/.test(componentIdentifier.name);
}

/**
 * Returns the runtime string name for a TypeScript type member key.
 *
 * Example:
 * ```ts
 * interface Props {
 *   title: string;
 *   onSelect(): void;
 *   'data-id': string;
 *   0: string;
 * }
 * ```
 *
 * This returns `"title"`, `"onSelect"`, `"data-id"`, and `"0"`.
 */
function getTypeMemberName(typeMember: TypeMemberNode | undefined): string | undefined {
  if (!typeMember) {
    return undefined;
  }

  const { key } = typeMember;
  if (key.type === 'Identifier') {
    return key.name;
  }
  if (key.type === 'Literal' && (typeof key.value === 'string' || typeof key.value === 'number')) {
    return String(key.value);
  }

  return undefined;
}

/**
 * Returns true when a component props type candidate contains the reported type member.
 *
 * First we try to match the exact TypeScript member declaration.
 * If that fails, we check whether the component props type candidate still references the
 * reported enclosing type.
 *
 * In both cases the final prop type on the component must stay assignable from the
 * reported member type.
 */
function componentPropsIncludeReportedTypeMember(
  componentNode: estree.Node,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedEnclosingType: ReportedEnclosingType,
  reportedTypeMember: ReportedTypeMember,
): boolean {
  if (isClassComponentNode(componentNode) && !hasRenderMethodOrProperty(componentNode)) {
    return false;
  }

  if (isFunctionComponentNode(componentNode) && !isPascalCaseFunctionComponent(componentNode)) {
    return false;
  }

  const componentPropsTypeCandidates = getComponentPropsTypeCandidates(componentNode, services);
  if (
    // The exact member match already proves that the component uses the
    // declaration that contains the reported type member.
    componentPropsTypeCandidates.some(componentPropsType =>
      hasExactAssignableReportedTypeMember(componentPropsType, reportedTypeMember, checker),
    )
  ) {
    return true;
  }

  return componentPropsTypeCandidates.some(
    componentPropsType =>
      hasAssignableReportedTypeMember(componentPropsType, reportedTypeMember, checker) &&
      reportedEnclosingType.isUsedByType(componentPropsType, checker),
  );
}

function hasExactAssignableReportedTypeMember(
  componentPropsType: ts.Type,
  reportedTypeMember: ReportedTypeMember,
  checker: ts.TypeChecker,
): boolean {
  const componentPropSymbol = getAssignableComponentPropSymbol(
    componentPropsType,
    reportedTypeMember,
    checker,
  );
  return componentPropSymbol
    ? hasExactReportedTypeMemberDeclaration(componentPropSymbol, reportedTypeMember)
    : false;
}

function hasAssignableReportedTypeMember(
  componentPropsType: ts.Type,
  reportedTypeMember: ReportedTypeMember,
  checker: ts.TypeChecker,
): boolean {
  return (
    getAssignableComponentPropSymbol(componentPropsType, reportedTypeMember, checker) !== undefined
  );
}

function getAssignableComponentPropSymbol(
  componentPropsType: ts.Type,
  reportedTypeMember: ReportedTypeMember,
  checker: ts.TypeChecker,
): ts.Symbol | undefined {
  const componentPropSymbol = componentPropsType.getProperty(reportedTypeMember.name);
  if (!componentPropSymbol) {
    return undefined;
  }

  return isReportedTypeMemberTypeAssignableToComponentProp(
    componentPropSymbol,
    reportedTypeMember,
    checker,
  )
    ? componentPropSymbol
    : undefined;
}

function isReportedTypeMemberTypeAssignableToComponentProp(
  componentPropSymbol: ts.Symbol,
  reportedTypeMember: ReportedTypeMember,
  checker: ts.TypeChecker,
): boolean {
  const componentPropType = checker.getTypeOfSymbol(componentPropSymbol);
  return checker.isTypeAssignableTo(reportedTypeMember.tsType, componentPropType);
}

function hasExactReportedTypeMemberDeclaration(
  componentPropSymbol: ts.Symbol,
  reportedTypeMember: ReportedTypeMember,
): boolean {
  return (
    componentPropSymbol.declarations?.some(
      declaration => ts.isTypeElement(declaration) && declaration === reportedTypeMember.tsNode,
    ) === true
  );
}

/**
 * Returns true when a class component declares a `render` member.
 *
 * Examples:
 * ```tsx
 * class Panel extends React.Component {
 *   render() {
 *     return <div />;
 *   }
 * }
 *
 * class Panel extends React.Component {
 *   render = () => <div />;
 * }
 * ```
 *
 * Both declarations count.
 */
function hasRenderMethodOrProperty(componentNode: estree.Node): boolean {
  if (!isClassComponentNode(componentNode)) {
    return false;
  }

  return componentNode.body.body.some(
    member =>
      (member.type === 'MethodDefinition' || member.type === 'PropertyDefinition') &&
      member.key.type === 'Identifier' &&
      member.key.name === 'render',
  );
}

/**
 * Performs a shallow AST walk from `root` and returns every top-level component node
 * (`ClassDeclaration`, `ClassExpression`, `FunctionDeclaration`, `FunctionExpression`,
 * `ArrowFunctionExpression`).
 *
 * Example:
 * ```tsx
 * function Header() {
 *   return <div />;
 * }
 *
 * const Footer = () => <div />;
 * const Sidebar = function () {
 *   return <div />;
 * };
 * const Panel = class extends React.Component {};
 * ```
 *
 * These four component definitions are collected.
 *
 * "Shallow" means the walk stops when it reaches a component node. It does not go
 * inside the component body.
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
 * Returns `true` when a class component uses `propsType` as its props type.
 *
 * We compare against the resolved `props` property, not just the type argument in
 * `extends React.Component<...>`, so subclasses keep the ownership.
 *
 * We use mutual assignability to avoid loose matches on unrelated optional shapes.
 */
function matchesClassProps(
  cls: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
  propsType: ts.Type,
): boolean {
  return areMutuallyAssignableTypes(checker, propsType, getClassPropsPropertyType(cls, checker));
}

/**
 * Returns `true` when a function component uses `propsType` as its props type.
 *
 * This reuses `getComponentPropsType`, so it benefits from the same fallback logic
 * for contextually typed function expressions.
 *
 * Lowercase function names are ignored because they are usually helpers, not components.
 * We use mutual assignability to avoid loose matches.
 */
function matchesFunctionProps(
  componentNode: estree.Node,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  propsType: ts.Type,
): boolean {
  // Skip non-PascalCase names to avoid matching helper functions
  // that happen to accept the same props type (React components use PascalCase by convention).
  if (!isPascalCaseFunctionComponent(componentNode)) {
    return false;
  }
  return getComponentPropsTypeCandidates(componentNode, services).some(componentParamType =>
    areMutuallyAssignableTypes(checker, propsType, componentParamType),
  );
}

/**
 * Returns the identifier that names a component, regardless of declaration form.
 *
 * Examples:
 * ```tsx
 * function Header() {}
 * const Footer = () => <div />;
 * const Modal = function () {
 *   return <div />;
 * };
 * const Panel = class extends React.Component {};
 * ```
 *
 * This resolves to `Header`, `Footer`, `Modal`, and `Panel`.
 */
export function getComponentIdentifier(componentNode: estree.Node): estree.Identifier | undefined {
  const parent = getNodeParent(componentNode);
  if (isVariableAssignedFunctionOrClassExpression(componentNode, parent)) {
    return parent.id;
  }

  if (hasIdentifierId(componentNode)) {
    return componentNode.id;
  }

  return isVariableDeclaratorWithIdentifierId(parent) ? parent.id : undefined;
}
