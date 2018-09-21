/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import * as espree from "espree";
import { SourceCode } from "eslint";

const PARSER_CONFIG = {
  tokens: true,
  comment: true,
  loc: true,
  range: true,
  ecmaVersion: 2019,
  ecmaFeatures: {
    jsx: true,
    globalReturn: true,
  },
};

export function parseSourceFile(fileContent: string, filepath: string): SourceCode | undefined {
  try {
    const ast = espree.parse(fileContent, PARSER_CONFIG);
    return new SourceCode(fileContent, ast);
  } catch (ex) {
    console.error(
      `Failed to parse file [${filepath}] at line ${ex.lineNumber} (espree parser): ${ex.message}`,
    );
    return undefined;
  }
}
