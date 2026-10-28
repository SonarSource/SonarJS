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
import ts from 'typescript';
import type { SourceCode } from 'eslint';
import type { SourceLocation } from 'estree';
import type { ParserServices, ParserServicesWithTypeInformation } from '@typescript-eslint/utils';

export type RequiredParserServices = ParserServicesWithTypeInformation;

export function isRequiredParserServices(
  services: ParserServices | undefined,
): services is RequiredParserServices {
  // see https://github.com/typescript-eslint/typescript-eslint/issues/7124
  return !!services?.program;
}

/** Map compiler diagnostics through ESTree, whose locations Vue restores to the SFC. */
export function getTypeScriptDiagnosticLocation(
  sourceCode: SourceCode,
  services: RequiredParserServices,
  diagnostic: ts.DiagnosticWithLocation,
): SourceLocation | undefined {
  const { file, start, length } = diagnostic;
  let originalStart: number | undefined;
  if (file.text === sourceCode.text) {
    originalStart = start;
  } else {
    const expected = file.text.slice(start, start + length);
    function visit(node: ts.Node) {
      const nodeStart = node.getStart(file);
      if (nodeStart > start || node.end < start + length) {
        return;
      }
      const original = services.tsNodeToESTreeNodeMap.get(node);
      if (original) {
        const candidate = original.range[0] + start - nodeStart;
        if (sourceCode.text.slice(candidate, candidate + length) === expected) {
          originalStart = candidate;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  // Synthetic setup/generic nodes may have no corresponding source location.
  if (originalStart === undefined) {
    return undefined;
  }
  return {
    start: sourceCode.getLocFromIndex(originalStart),
    end: sourceCode.getLocFromIndex(originalStart + length),
  };
}
