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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { parseForESLint } from '@typescript-eslint/parser';
import ts from 'typescript';
import type { RequiredParserServices } from '../../../../src/jsts/rules/helpers/parser-services.js';
import {
  getReportedEnclosingType,
  ReportedTypeDetails,
} from '../../../../src/jsts/rules/helpers/reported-type.js';
import { createProgramFromSingleFile } from '../../../../src/jsts/program/factory.js';

function createProgramFromSource(sourceCode: string): {
  services: RequiredParserServices;
  ast: any;
} {
  const fileName = 'reported-type.test.ts';
  const program = createProgramFromSingleFile(fileName, sourceCode);
  const parseResult = parseForESLint(sourceCode, {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    ecmaVersion: 2020,
    sourceType: 'module',
    programs: [program],
    filePath: fileName,
  });

  return {
    services: parseResult.services as RequiredParserServices,
    ast: parseResult.ast,
  };
}

function findNodeWithAncestorsByText(
  node: any,
  text: string,
  ancestors: any[] = [],
): { node: any; ancestors: any[] } | null {
  if (node.type === 'Identifier' && node.name === text) {
    return { node, ancestors };
  }

  for (const key in node) {
    if (key === 'parent') continue;
    const child = node[key];
    if (!child || typeof child !== 'object') {
      continue;
    }

    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object') {
          const found = findNodeWithAncestorsByText(item, text, [...ancestors, node]);
          if (found) {
            return found;
          }
        }
      }
      continue;
    }

    const found = findNodeWithAncestorsByText(child, text, [...ancestors, node]);
    if (found) {
      return found;
    }
  }

  return null;
}

function getTypeByIdentifierText(ast: any, services: RequiredParserServices, text: string) {
  const found = findNodeWithAncestorsByText(ast, text);
  expect(found).toBeTruthy();
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(found!.node));
}

describe('ReportedTypeDetails', () => {
  it('returns undefined when declaration details are missing or point to the wrong TS node kind', () => {
    const sourceCode = `
      interface SharedProps {
        sharedValue: string;
      }
    `;
    const { services, ast } = createProgramFromSource(sourceCode);
    const checker = services.program.getTypeChecker();
    const sharedValue = findNodeWithAncestorsByText(ast, 'sharedValue');
    expect(sharedValue).toBeTruthy();

    expect(
      ReportedTypeDetails.fromDeclaration(undefined, undefined, services, checker, ts.isInterfaceDeclaration),
    ).toBeUndefined();
    expect(
      ReportedTypeDetails.fromDeclaration(
        sharedValue!.ancestors.at(-1),
        'sharedValue',
        services,
        checker,
        ts.isInterfaceDeclaration,
      ),
    ).toBeUndefined();
  });

  it('tracks interface declarations through extends chains, unions, intersections, and nested references', () => {
    const sourceCode = `
      interface SharedProps {
        sharedValue: string;
      }

      interface ChildProps extends SharedProps {
        title: string;
      }

      type WrappedProps = (ChildProps & {
        compact: boolean;
      });

      type UnrelatedProps = {
        title: string;
      };

      const childPropsValue = {} as ChildProps;
      const unrelatedPropsValue = {} as UnrelatedProps;
    `;
    const { services, ast } = createProgramFromSource(sourceCode);
    const checker = services.program.getTypeChecker();
    const sharedValue = findNodeWithAncestorsByText(ast, 'sharedValue');
    expect(sharedValue).toBeTruthy();

    const reportedType = getReportedEnclosingType(sharedValue!.ancestors, services, checker);
    expect(reportedType?.name).toBe('SharedProps');
    expect(reportedType?.isUsedByType(reportedType.tsType, checker)).toBe(true);
    expect(
      reportedType?.isUsedByType(getTypeByIdentifierText(ast, services, 'childPropsValue'), checker),
    ).toBe(true);
    expect(reportedType?.isUsedByType(getTypeByIdentifierText(ast, services, 'WrappedProps'), checker)).toBe(true);
    expect(
      reportedType?.isUsedByType(getTypeByIdentifierText(ast, services, 'unrelatedPropsValue'), checker),
    ).toBe(false);
  });

  it('resolves enclosing type aliases and matching alias instantiations', () => {
    const sourceCode = `
      type SharedAlias = {
        aliasedValue: string;
      };

      type ParenthesizedAlias = (SharedAlias);

      const aliasValue = {} as ParenthesizedAlias;
    `;
    const { services, ast } = createProgramFromSource(sourceCode);
    const checker = services.program.getTypeChecker();
    const aliasedValue = findNodeWithAncestorsByText(ast, 'aliasedValue');
    expect(aliasedValue).toBeTruthy();

    const reportedType = getReportedEnclosingType(aliasedValue!.ancestors, services, checker);
    expect(reportedType?.name).toBe('SharedAlias');
    expect(reportedType?.isUsedByType(getTypeByIdentifierText(ast, services, 'aliasValue'), checker)).toBe(
      true,
    );
  });

  it('handles recursive type aliases without looping', () => {
    const sourceCode = `
      type Tree = {
        value: string;
        left?: Tree;
        right?: Tree;
      };

      const treeValue = {} as Tree;
    `;
    const { services, ast } = createProgramFromSource(sourceCode);
    const checker = services.program.getTypeChecker();
    const value = findNodeWithAncestorsByText(ast, 'value');
    expect(value).toBeTruthy();

    const reportedType = getReportedEnclosingType(value!.ancestors, services, checker);
    expect(reportedType?.name).toBe('Tree');
    expect(reportedType?.isUsedByType(getTypeByIdentifierText(ast, services, 'treeValue'), checker)).toBe(
      true,
    );
  });

  it('handles missing symbols, previously-seen symbols, and symbol short-circuits', () => {
    const sourceCode = `
      interface SharedProps {
        sharedValue: string;
      }

      interface ChildProps extends SharedProps {
        title: string;
      }

      const childPropsValue = {} as ChildProps;
    `;
    const { services, ast } = createProgramFromSource(sourceCode);
    const checker = services.program.getTypeChecker();
    const sharedValue = findNodeWithAncestorsByText(ast, 'sharedValue');
    expect(sharedValue).toBeTruthy();

    const reportedType = getReportedEnclosingType(sharedValue!.ancestors, services, checker);
    expect(reportedType).toBeDefined();

    const childPropsType = getTypeByIdentifierText(ast, services, 'childPropsValue');
    const childPropsSymbol = childPropsType.aliasSymbol ?? childPropsType.symbol;
    expect(childPropsSymbol).toBeDefined();

    const withoutReportedSymbol = new ReportedTypeDetails(
      reportedType!.name,
      reportedType!.declaration,
      reportedType!.tsNode,
      reportedType!.tsType,
      undefined,
    );
    expect(withoutReportedSymbol.isUsedByType(childPropsType, checker)).toBe(false);

    expect(reportedType!.isUsedByType(childPropsType, checker, new Set([childPropsSymbol!]))).toBe(false);

    const sameSymbolShortcut = new ReportedTypeDetails(
      reportedType!.name,
      reportedType!.declaration,
      reportedType!.tsNode,
      checker.getNeverType(),
      reportedType!.tsTypeSymbol,
    );
    expect(sameSymbolShortcut.isUsedByType(reportedType!.tsType, checker)).toBe(true);
  });
});
