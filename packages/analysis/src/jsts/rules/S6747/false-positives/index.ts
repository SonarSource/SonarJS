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
import type estree from 'estree';
import type { DependenciesList } from '../../helpers/dependency-manifests/resolvers/types.js';
import { isTypeOnlyImport } from '../../helpers/ast.js';

type ImportSpecifierWithKind = estree.ImportDeclaration['specifiers'][number] & {
  importKind?: string | null;
};

type FalsePositiveSignals = {
  dependencies: DependenciesList;
  imports: estree.ImportDeclaration[];
};

type FalsePositiveEscape = {
  readonly isActive: (signals: FalsePositiveSignals) => boolean;
  readonly ignoredProps: readonly string[];
};

const TAILWIND_JSX_MODULES = ['next/og', '@vercel/og', 'satori', 'twin.macro'] as const;

const FALSE_POSITIVE_ESCAPES: readonly FalsePositiveEscape[] = [
  {
    isActive: ({ dependencies }) => dependencies.has('next') || dependencies.has('styled-jsx'),
    ignoredProps: ['jsx', 'global'],
  },
  {
    isActive: signals =>
      hasDependencyOrRuntimeImport(signals, ['@emotion/react', 'styled-components']),
    ignoredProps: ['css'],
  },
  {
    isActive: signals => hasDependencyOrRuntimeImport(signals, ['theme-ui', '@theme-ui/core']),
    ignoredProps: ['sx'],
  },
  {
    isActive: signals => hasRuntimeImport(signals, TAILWIND_JSX_MODULES),
    ignoredProps: ['tw'],
  },
];

export function getIgnoredProps(signals: FalsePositiveSignals): string[] {
  return [
    ...new Set(
      FALSE_POSITIVE_ESCAPES.filter(falsePositiveEscape =>
        falsePositiveEscape.isActive(signals),
      ).flatMap(falsePositiveEscape => falsePositiveEscape.ignoredProps),
    ),
  ];
}

function hasRuntimeImport(signals: FalsePositiveSignals, moduleNames: readonly string[]): boolean {
  return signals.imports.some(
    importDeclaration =>
      !isTypeOnlyImportDeclaration(importDeclaration) &&
      moduleNames.includes(String(importDeclaration.source.value)),
  );
}

function isTypeOnlyImportDeclaration(importDeclaration: estree.ImportDeclaration): boolean {
  return (
    isTypeOnlyImport(importDeclaration) ||
    (importDeclaration.specifiers.length > 0 &&
      importDeclaration.specifiers.every(isTypeOnlyImportSpecifier))
  );
}

function isTypeOnlyImportSpecifier(
  specifier: estree.ImportDeclaration['specifiers'][number],
): boolean {
  return (specifier as ImportSpecifierWithKind).importKind === 'type';
}

function hasDependencyOrRuntimeImport(
  signals: FalsePositiveSignals,
  moduleNames: readonly string[],
): boolean {
  return (
    moduleNames.some(moduleName => signals.dependencies.has(moduleName)) ||
    hasRuntimeImport(signals, moduleNames)
  );
}
