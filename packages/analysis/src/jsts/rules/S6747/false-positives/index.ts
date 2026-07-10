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
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { DependenciesList } from '../../helpers/dependency-manifests/resolvers/types.js';
import { isReactThreeFiberIntrinsicProp, REACT_THREE_FIBER } from './react-three-fiber.js';

type FalsePositiveSignals = {
  dependencies: DependenciesList;
  runtimeImports: estree.ImportDeclaration[];
};

type FalsePositiveEscape = {
  readonly isActive: (signals: FalsePositiveSignals) => boolean;
  readonly ignoredProps?: readonly string[];
  readonly shouldSuppressReport?: (descriptor: Rule.ReportDescriptor) => boolean;
};

const TAILWIND_JSX_MODULES = ['next/og', '@vercel/og', 'satori', 'twin.macro'] as const;

const FALSE_POSITIVE_ESCAPES: readonly FalsePositiveEscape[] = [
  {
    isActive: ({ dependencies }) => dependencies.has('next') || dependencies.has('styled-jsx'),
    ignoredProps: ['jsx', 'global'],
  },
  {
    isActive: ({ dependencies }) => dependencies.has('@emotion/react'),
    ignoredProps: ['css'],
  },
  {
    isActive: signals => hasRuntimeImport(signals, TAILWIND_JSX_MODULES),
    ignoredProps: ['tw'],
  },
  {
    isActive: signals =>
      signals.dependencies.has(REACT_THREE_FIBER) || hasRuntimeImport(signals, [REACT_THREE_FIBER]),
    shouldSuppressReport: isReactThreeFiberIntrinsicProp,
  },
];

export function getActiveFalsePositiveEscapes(
  signals: FalsePositiveSignals,
): FalsePositiveEscape[] {
  return FALSE_POSITIVE_ESCAPES.filter(escape => escape.isActive(signals));
}

export function getIgnoredProps(activeEscapes: readonly FalsePositiveEscape[]): string[] {
  return [...new Set(activeEscapes.flatMap(escape => escape.ignoredProps ?? []))];
}

export function shouldSuppressReport(
  activeEscapes: readonly FalsePositiveEscape[],
  descriptor: Rule.ReportDescriptor,
): boolean {
  return activeEscapes.some(escape => escape.shouldSuppressReport?.(descriptor));
}

function hasRuntimeImport(signals: FalsePositiveSignals, moduleNames: readonly string[]): boolean {
  return signals.runtimeImports.some(importDeclaration =>
    moduleNames.includes(String(importDeclaration.source.value)),
  );
}
