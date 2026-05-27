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
import type estree from 'estree';
import ts from 'typescript';
import type { RequiredParserServices } from '../parser-services.js';
import { areSameTypeDeclarations, getTypeFromTreeNode } from '../type.js';
import {
  getOwningVariableDeclarator,
  isAnonymousDefaultExportComponent,
} from './component-identity.js';
import type { ComponentAnalysis } from './component-analysis.js';
import type { FunctionComponentNode } from './component-nodes.js';

const REACT_FUNCTION_COMPONENT_TYPES = new Set(['FC', 'FunctionComponent']);
const REACT_FORWARD_REF_RENDER_FUNCTION_TYPES = new Set(['ForwardRefRenderFunction']);

export function createFunctionComponentAnalysis(
  componentNode: FunctionComponentNode,
  componentIdentifier: estree.Identifier | undefined,
  services: RequiredParserServices,
): ComponentAnalysis | undefined {
  if (!isEligibleFunctionComponent(componentNode, componentIdentifier)) {
    return undefined;
  }

  const propsTypeCandidates = getFunctionComponentPropsTypeCandidates(componentNode, services);
  return {
    memberPropsTypeCandidates: propsTypeCandidates,
    enclosingTypePropsTypeCandidates: propsTypeCandidates,
    classNonPropsTypeCandidates: [],
  };
}

export function getFunctionComponentPropsTypeCandidates(
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
