/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
/**
 * An extracted embedded JavaScript code snippet from a YAML file
 *
 * @param code JS code
 * @param line Line where JS code starts
 * @param column Column where JS code starts
 * @param offset Offset where JS code starts
 * @param lineStarts Offset at each line start for the JS snippet
 * @param fileLineStarts Offset at each line start for the whole file - only for HTML
 * @param text Whole YAML file content
 * @param format Format of the YAML string that embeds the JS code
 * @param extras Additionnal data, filled by ExtrasPicker
 */
export type EmbeddedJS = {
  code: string;
  line: number;
  column: number;
  offset: number;
  lineStarts: number[];
  fileLineStarts?: number[];
  text: string;
  format: 'PLAIN' | 'BLOCK_FOLDED' | 'BLOCK_LITERAL';
  extras: {
    resourceName?: string;
  };
};
