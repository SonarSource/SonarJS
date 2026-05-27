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
import { childrenOf } from '../ancestor.js';
import type { RequiredParserServices } from '../parser-services.js';
import { areSameTypeDeclarations, getTypeFromTreeNode } from '../type.js';
import {
  getComponentIdentifier,
  getOwningVariableDeclarator,
  isAnonymousDefaultExportComponent,
} from './component-identity.js';
import {
  isClassComponentNode,
  isComponentNode,
  isFunctionComponentNode,
  type ClassComponentNode,
  type ComponentNode,
  type FunctionComponentNode,
} from './component-nodes.js';

export { isComponentNode, type ComponentNode } from './component-nodes.js';
export { getComponentIdentifier, getComponentVariable } from './component-identity.js';

const REACT_LOCAL_CLASS_SUPERS = new Set(['Component', 'PureComponent']);
const REACT_FUNCTION_COMPONENT_TYPES = new Set(['FC', 'FunctionComponent']);
const REACT_FORWARD_REF_RENDER_FUNCTION_TYPES = new Set(['ForwardRefRenderFunction']);

export type ComponentAnalysis = {
  memberPropsTypeCandidates: ts.Type[];
  enclosingTypePropsTypeCandidates: ts.Type[];
  classNonPropsTypeCandidates: ts.Type[];
};
export type CollectedComponent = {
  componentNode: ComponentNode;
  componentIdentifier: estree.Identifier | undefined;
};

const EMPTY_COMPONENT_ANALYSIS: ComponentAnalysis = {
  memberPropsTypeCandidates: [],
  enclosingTypePropsTypeCandidates: [],
  classNonPropsTypeCandidates: [],
};

function getClassComponentTsNode(
  componentNode: ClassComponentNode,
  services: RequiredParserServices,
): ts.ClassLikeDeclaration {
  return services.esTreeNodeToTSNodeMap.get(
    componentNode as TSESTree.Node,
  ) as ts.ClassLikeDeclaration;
}

export function getComponentPropsType(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type | undefined {
  return getComponentPropsTypeCandidates(componentNode, services)[0];
}

function getComponentPropsTypeCandidates(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type[] {
  if (isFunctionComponentNode(componentNode)) {
    return getFunctionComponentPropsTypeCandidates(componentNode, services);
  }

  if (isClassComponentNode(componentNode)) {
    return getClassComponentPropsTypeCandidates(componentNode, services);
  }

  return [];
}

function getFunctionComponentPropsTypeCandidates(
  componentNode: FunctionComponentNode,
  services: RequiredParserServices,
): ts.Type[] {
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

function getClassComponentPropsTypeCandidates(
  componentNode: ClassComponentNode,
  services: RequiredParserServices,
): ts.Type[] {
  const checker = services.program.getTypeChecker();
  const classTsNode = getClassComponentTsNode(componentNode, services);
  const propsType =
    getDeclaredClassPropsType(classTsNode, checker) ??
    getClassPropsPropertyType(classTsNode, checker);
  return propsType ? [propsType] : [];
}

function isSpecificPropsType(type: ts.Type | undefined): type is ts.Type {
  return !!type && (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) === 0;
}

function getFunctionComponentParamPropsType(
  componentNode: FunctionComponentNode,
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

function isQualifiedReactClassSuper(
  objectName: string | undefined,
  propertyName: string,
): boolean {
  return objectName === undefined
    ? isReactClassSuperName(propertyName)
    : objectName === 'React' && isReactClassSuperName(propertyName);
}

function isBuiltinReactSuperclass(superClass: estree.Expression): boolean {
  return (
    (superClass.type === 'Identifier' && isQualifiedReactClassSuper(undefined, superClass.name)) ||
    (superClass.type === 'MemberExpression' &&
      isIdentifier(superClass.object, 'React') &&
      superClass.property.type === 'Identifier' &&
      isQualifiedReactClassSuper(superClass.object.name, superClass.property.name))
  );
}

export function isReactClassComponent(
  node: estree.Node,
): node is estree.ClassDeclaration | estree.ClassExpression {
  return (
    isClassComponentNode(node) &&
    node.superClass != null &&
    isBuiltinReactSuperclass(node.superClass)
  );
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

export function isBuiltinReactSuperclassName(
  objectName: string | undefined,
  propertyName: string,
): boolean {
  return isQualifiedReactClassSuper(objectName, propertyName);
}

function getDeclaredClassPropsType(
  classNode: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
): ts.Type | undefined {
  const propsTypeNode = getReactSuperclassTypeArguments(classNode)[0];
  return propsTypeNode ? checker.getTypeAtLocation(propsTypeNode) : undefined;
}

function getReactSuperclassTypeArguments(
  classNode: ts.ClassLikeDeclaration,
): readonly ts.TypeNode[] {
  const extendsClause = classNode.heritageClauses?.find(
    clause => clause.token === ts.SyntaxKind.ExtendsKeyword,
  );
  const reactSuperclass = extendsClause?.types.find(type =>
    isReactComponentHeritageSuperclass(type),
  );
  return reactSuperclass?.typeArguments ?? [];
}

function getDeclaredClassNonPropsTypes(
  classNode: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
): ts.Type[] {
  return getReactSuperclassTypeArguments(classNode)
    .slice(1)
    .map(typeArgument => checker.getTypeAtLocation(typeArgument));
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

/**
 * Returns whether a function component should participate in component analysis.
 * Named components must follow React's uppercase convention, while anonymous
 * function components stay eligible only when they are exported as default.
 */
function isEligibleFunctionComponent(
  componentNode: FunctionComponentNode,
  componentIdentifier: estree.Identifier | undefined,
): boolean {
  return componentIdentifier === undefined
    ? isAnonymousDefaultExportComponent(componentNode)
    : /^[A-Z]/.test(componentIdentifier.name);
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
    const classTsNode = getClassComponentTsNode(componentNode, services);
    const classPropsType = getClassPropsPropertyType(classTsNode, checker);
    const memberPropsTypeCandidates = getComponentPropsTypeCandidates(componentNode, services);
    return {
      memberPropsTypeCandidates,
      enclosingTypePropsTypeCandidates: classPropsType ? [classPropsType] : [],
      classNonPropsTypeCandidates: getDeclaredClassNonPropsTypes(classTsNode, checker),
    };
  }

  if (
    !isFunctionComponentNode(componentNode) ||
    !isEligibleFunctionComponent(componentNode, componentIdentifier)
  ) {
    return EMPTY_COMPONENT_ANALYSIS;
  }

  const propsTypeCandidates = getComponentPropsTypeCandidates(componentNode, services);
  return {
    memberPropsTypeCandidates: propsTypeCandidates,
    enclosingTypePropsTypeCandidates: propsTypeCandidates,
    classNonPropsTypeCandidates: [],
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
