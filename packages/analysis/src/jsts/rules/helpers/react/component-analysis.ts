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
import type { SourceCode } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { childrenOf, getNodeParent } from '../ancestor.js';
import { isIdentifier } from '../ast.js';
import type { RequiredParserServices } from '../parser-services.js';
import { areSameTypeDeclarations, getTypeFromTreeNode } from '../type.js';

const COMPONENT_NODE_TYPES = new Set([
  'ClassDeclaration',
  'ClassExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const REACT_LOCAL_CLASS_SUPERS = new Set(['Component', 'PureComponent']);
const REACT_FUNCTION_COMPONENT_TYPES = new Set(['FC', 'FunctionComponent']);
const REACT_FORWARD_REF_RENDER_FUNCTION_TYPES = new Set(['ForwardRefRenderFunction']);
const REACT_COMPONENT_WRAPPER_CALLEES = new Set(['memo', 'forwardRef']);

export type ComponentAnalysis = {
  memberPropsTypeCandidates: ts.Type[];
  enclosingTypePropsTypeCandidates: ts.Type[];
};
export type ComponentNode =
  | estree.ClassDeclaration
  | estree.ClassExpression
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;
export type CollectedComponent = {
  componentNode: ComponentNode;
  componentIdentifier: estree.Identifier | undefined;
};

const EMPTY_COMPONENT_ANALYSIS: ComponentAnalysis = {
  memberPropsTypeCandidates: [],
  enclosingTypePropsTypeCandidates: [],
};

function isClassComponentNode(
  node: estree.Node,
): node is estree.ClassDeclaration | estree.ClassExpression {
  return node.type === 'ClassDeclaration' || node.type === 'ClassExpression';
}

function isFunctionComponentNode(
  node: estree.Node,
): node is estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

function hasIdentifierId(node: estree.Node): node is estree.Node & { id: estree.Identifier } {
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

function isVariableDeclaratorWithIdentifierId(
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

function isVariableAssignedFunctionOrClassExpression(
  componentNode: estree.Node,
  parent: unknown,
): parent is estree.VariableDeclarator & { id: estree.Identifier } {
  return (
    (componentNode.type === 'ClassExpression' || componentNode.type === 'FunctionExpression') &&
    isVariableDeclaratorWithIdentifierId(parent)
  );
}

function isReactComponentWrapperCallee(callee: estree.Expression | estree.Super): boolean {
  return (
    (callee.type === 'Identifier' && REACT_COMPONENT_WRAPPER_CALLEES.has(callee.name)) ||
    (callee.type === 'MemberExpression' &&
      isIdentifier(callee.object, 'React') &&
      callee.property.type === 'Identifier' &&
      REACT_COMPONENT_WRAPPER_CALLEES.has(callee.property.name))
  );
}

function isWrappedInReactComponentCall(
  node: estree.Node,
  parent: estree.Node | undefined,
): parent is estree.CallExpression {
  return (
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(node as unknown as estree.Expression) &&
    isReactComponentWrapperCallee(parent.callee)
  );
}

function getOwningVariableDeclarator(
  componentNode: estree.Node,
): (estree.VariableDeclarator & { id: estree.Identifier }) | undefined {
  let currentNode: estree.Node = componentNode;
  let parent = getNodeParent(currentNode);

  while (isWrappedInReactComponentCall(currentNode, parent)) {
    currentNode = parent;
    parent = getNodeParent(currentNode);
  }

  return isVariableDeclaratorWithIdentifierId(parent) ? parent : undefined;
}

export function getComponentPropsType(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type | undefined {
  const checker = services.program.getTypeChecker();
  if (isFunctionComponentNode(componentNode)) {
    return (
      getFunctionComponentParamPropsType(componentNode, services) ??
      getComponentPropsTypeFromVariableDeclaration(componentNode, services)
    );
  }

  if (!isClassComponentNode(componentNode)) {
    return undefined;
  }

  const tsNode = getClassComponentTsNode(componentNode, services);
  return getDeclaredClassPropsType(tsNode, checker) ?? getClassPropsPropertyType(tsNode, checker);
}

function getComponentPropsTypeCandidates(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type[] {
  if (!isFunctionComponentNode(componentNode)) {
    const propsType = getComponentPropsType(componentNode, services);
    return propsType ? [propsType] : [];
  }

  const checker = services.program.getTypeChecker();
  const propsTypes: ts.Type[] = [];
  const primaryPropsType = getFunctionComponentParamPropsType(componentNode, services);
  if (primaryPropsType) {
    propsTypes.push(primaryPropsType);
  }

  const declaredVariablePropsType = getComponentPropsTypeFromVariableDeclaration(
    componentNode,
    services,
  );
  if (
    declaredVariablePropsType &&
    !(
      primaryPropsType &&
      areSameTypeDeclarations(checker, primaryPropsType, declaredVariablePropsType)
    )
  ) {
    propsTypes.push(declaredVariablePropsType);
  }

  return propsTypes;
}

function isSpecificPropsType(type: ts.Type | undefined): type is ts.Type {
  return !!type && (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) === 0;
}

function getFunctionComponentParamPropsType(
  componentNode:
    | estree.FunctionDeclaration
    | estree.FunctionExpression
    | estree.ArrowFunctionExpression,
  services: RequiredParserServices,
): ts.Type | undefined {
  const firstParam = componentNode.params[0];
  const propsType = firstParam ? getTypeFromTreeNode(firstParam, services) : undefined;
  return isSpecificPropsType(propsType) ? propsType : undefined;
}

function getComponentPropsTypeFromVariableDeclaration(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type | undefined {
  const variableDeclarator = getOwningVariableDeclarator(componentNode);
  if (!variableDeclarator) {
    return undefined;
  }

  const declaredType = (variableDeclarator.id as TSESTree.Identifier).typeAnnotation
    ?.typeAnnotation;
  if (!declaredType) {
    return undefined;
  }

  const propsTypeNode = findDeclaredFunctionComponentPropsType(declaredType);
  return propsTypeNode
    ? getTypeFromTreeNode(propsTypeNode as unknown as estree.Node, services)
    : undefined;
}

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

function isReactClassSuperName(name: string): boolean {
  return REACT_LOCAL_CLASS_SUPERS.has(name);
}

function isQualifiedReactClassSuper(objectName: string | undefined, propertyName: string): boolean {
  return objectName === undefined
    ? isReactClassSuperName(propertyName)
    : objectName === 'React' && isReactClassSuperName(propertyName);
}

function isReactComponentHeritageSuperclass(superclass: ts.ExpressionWithTypeArguments): boolean {
  const expression = superclass.expression;
  if (ts.isIdentifier(expression)) {
    return isQualifiedReactClassSuper(undefined, expression.text);
  }
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    isQualifiedReactClassSuper(expression.expression.text, expression.name.text)
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

function isPascalCaseFunctionComponent(
  componentIdentifier: estree.Identifier | undefined,
): boolean {
  return componentIdentifier !== undefined && /^[A-Z]/.test(componentIdentifier.name);
}

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

export function isComponentNode(node: estree.Node): node is ComponentNode {
  return COMPONENT_NODE_TYPES.has(node.type);
}

function isCollectedComponent(
  component: ComponentNode | CollectedComponent,
): component is CollectedComponent {
  return 'componentNode' in component;
}

function getCollectedComponent(component: ComponentNode | CollectedComponent): CollectedComponent {
  return isCollectedComponent(component)
    ? component
    : {
        componentNode: component,
        componentIdentifier: getComponentIdentifier(component),
      };
}

export function createComponentAnalysis(
  component: ComponentNode | CollectedComponent,
  services: RequiredParserServices,
): ComponentAnalysis {
  const { componentNode, componentIdentifier } = getCollectedComponent(component);

  if (isClassComponentNode(componentNode)) {
    if (!hasRenderMethodOrProperty(componentNode)) {
      return EMPTY_COMPONENT_ANALYSIS;
    }

    const checker = services.program.getTypeChecker();
    const classPropsType = getClassPropsPropertyType(
      getClassComponentTsNode(componentNode, services),
      checker,
    );
    const memberPropsTypeCandidates = getComponentPropsTypeCandidates(componentNode, services);
    return {
      memberPropsTypeCandidates,
      enclosingTypePropsTypeCandidates: classPropsType ? [classPropsType] : [],
    };
  }

  if (
    !isFunctionComponentNode(componentNode) ||
    !isPascalCaseFunctionComponent(componentIdentifier)
  ) {
    return EMPTY_COMPONENT_ANALYSIS;
  }

  const propsTypeCandidates = getComponentPropsTypeCandidates(componentNode, services);
  return {
    memberPropsTypeCandidates: propsTypeCandidates,
    enclosingTypePropsTypeCandidates: propsTypeCandidates,
  };
}

function collectComponent(componentNode: ComponentNode): CollectedComponent {
  return {
    componentNode,
    componentIdentifier: getComponentIdentifier(componentNode),
  };
}

export function collectComponents(
  root: estree.Node,
  keys: SourceCode.VisitorKeys,
): CollectedComponent[] {
  const result: CollectedComponent[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (isComponentNode(node)) {
      result.push(collectComponent(node));
      continue;
    }
    const children = childrenOf(node, keys);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return result;
}

export function collectComponentNodes(
  root: estree.Node,
  keys: SourceCode.VisitorKeys,
): ComponentNode[] {
  return collectComponents(root, keys).map(component => component.componentNode);
}

export function getComponentIdentifier(componentNode: estree.Node): estree.Identifier | undefined {
  const variableDeclarator = getOwningVariableDeclarator(componentNode);
  if (
    variableDeclarator &&
    (isVariableAssignedFunctionOrClassExpression(componentNode, getNodeParent(componentNode)) ||
      componentNode.type === 'ArrowFunctionExpression' ||
      getNodeParent(componentNode)?.type === 'CallExpression')
  ) {
    return variableDeclarator.id;
  }

  if (hasIdentifierId(componentNode)) {
    return componentNode.id;
  }

  return variableDeclarator?.id;
}
