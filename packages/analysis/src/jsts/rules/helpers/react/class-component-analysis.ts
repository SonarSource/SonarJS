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
import ts from 'typescript';
import type { RequiredParserServices } from '../parser-services.js';
import type { ComponentAnalysis } from './component-analysis.js';
import type { ClassComponentNode } from './component-nodes.js';
import type { ClassComponentDescriptor } from './component-resolution.js';

const REACT_LOCAL_CLASS_SUPERS = new Set(['Component', 'PureComponent']);

export function createClassComponentAnalysis(
  component: ClassComponentDescriptor,
  services: RequiredParserServices,
): ComponentAnalysis {
  const checker = services.program.getTypeChecker();
  const classTsNode = getClassComponentTsNode(component.node, services);
  const classPropsType = getClassPropsPropertyType(classTsNode, checker);
  const memberPropsTypeCandidates = getClassComponentPropsTypeCandidates(component.node, services);
  return {
    memberPropsTypeCandidates,
    enclosingTypePropsTypeCandidates: classPropsType ? [classPropsType] : [],
    classNonPropsTypeCandidates: getDeclaredClassNonPropsTypes(classTsNode, checker),
  };
}

export function getClassComponentPropsTypeCandidates(
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

function getClassComponentTsNode(
  componentNode: ClassComponentDescriptor['node'],
  services: RequiredParserServices,
): ts.ClassLikeDeclaration {
  return services.esTreeNodeToTSNodeMap.get(
    componentNode as TSESTree.Node,
  ) as ts.ClassLikeDeclaration;
}

function isReactClassSuperName(name: string): boolean {
  return REACT_LOCAL_CLASS_SUPERS.has(name);
}

function isQualifiedReactClassSuper(objectName: string | undefined, propertyName: string): boolean {
  return objectName === undefined
    ? isReactClassSuperName(propertyName)
    : objectName === 'React' && isReactClassSuperName(propertyName);
}

export function isBuiltinReactSuperclassName(
  objectName: string | undefined,
  propertyName: string,
): boolean {
  return isQualifiedReactClassSuper(objectName, propertyName);
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
