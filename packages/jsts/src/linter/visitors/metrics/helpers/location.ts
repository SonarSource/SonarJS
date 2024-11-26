/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import estree from 'estree';

/**
 * A metric location
 *
 * @param startLine the starting line of the metric
 * @param startCol the starting column of the metric
 * @param endLine the ending line of the metric
 * @param endCol the ending column of the metric
 */
export interface Location {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

/**
 * Converts an ESLint location into a metric location
 * @param loc the ESLint location to convert
 * @returns the converted location
 */
export function convertLocation(loc: estree.SourceLocation): Location {
  return {
    startLine: loc.start.line,
    startCol: loc.start.column,
    endLine: loc.end.line,
    endCol: loc.end.column,
  };
}
