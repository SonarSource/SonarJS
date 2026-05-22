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
import type { ComponentAnalysis } from './component-analysis.js';
import { ReportedTypeDetails, type ReportedType } from '../reported-type.js';
import type { RequiredParserServices } from '../parser-services.js';

type TypeMemberNode = TSESTree.TSPropertySignature | TSESTree.TSMethodSignature;
export type ReportedTypeMember = ReportedTypeDetails<TypeMemberNode, ts.TypeElement>;

function isTypeMemberNode(node: TSESTree.Node): node is TypeMemberNode {
  return node.type === 'TSPropertySignature' || node.type === 'TSMethodSignature';
}

function findEnclosingTypeMember(ancestors: estree.Node[]): TypeMemberNode | undefined {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i] as TSESTree.Node;
    if (isTypeMemberNode(ancestor)) {
      return ancestor;
    }
  }
  return undefined;
}

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

export function getReportedTypeMember(
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

export function componentPropsIncludeReportedTypeMember(
  componentAnalysis: ComponentAnalysis,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember,
): boolean {
  return componentAnalysis.memberPropsTypeCandidates.some(componentPropsType =>
    slotIncludesReportedTypeMember(componentPropsType, checker, reportedType, reportedTypeMember),
  );
}

export function slotIncludesReportedTypeMember(
  slotType: ts.Type,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember,
): boolean {
  const slotPropSymbol = getAssignableComponentPropSymbol(slotType, reportedTypeMember, checker);
  return (
    slotPropSymbol !== undefined &&
    (hasExactReportedTypeMemberDeclaration(slotPropSymbol, reportedTypeMember) ||
      reportedType.isUsedByType(slotType, checker))
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
