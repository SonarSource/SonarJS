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
import { parseSourceFile } from "./parser";
import * as linter from "./linter";

export interface AnalysisInput {
  fileUri: string;
  fileContent: string;
  rules: Rule[];
}

// eslint rule key
export type Rule = string;

export interface Issue {
  column: number;
  line: number;
  endColumn?: number;
  endLine?: number;
  ruleId: string;
  message: string;
}

export function analyze(input: AnalysisInput) {
  const { fileUri, fileContent } = input;
  if (fileContent) {
    const sourceCode = parseSourceFile(fileContent, fileUri);
    if (sourceCode) {
      return linter.analyze(sourceCode, input.rules, fileUri);
    }
  }
  return [];
}
