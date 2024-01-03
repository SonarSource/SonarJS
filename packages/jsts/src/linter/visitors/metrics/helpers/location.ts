/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as estree from 'estree';

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
