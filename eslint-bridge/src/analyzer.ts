/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { parseSourceFile, parseTypeScriptSourceFile } from "./parser";
import * as linter from "./linter";

const EMPTY_RESPONSE: AnalysisResponse = { issues: [] };

export interface AnalysisInput {
  filePath: string;
  fileContent: string;
  rules: Rule[];
}

export interface TypeScriptAnalysisInput extends AnalysisInput {
  tsConfigs: string[];
}

// eslint rule key
export interface Rule {
  key: string;
  // Currently we only have rules that accept strings, but configuration can be a JS object or a string.
  configurations: any[];
}

export interface AnalysisResponse {
  issues: Issue[];
}

export interface Issue {
  column: number;
  line: number;
  endColumn?: number;
  endLine?: number;
  ruleId: string;
  message: string;
  cost?: number;
  secondaryLocations: IssueLocation[];
}

export interface IssueLocation {
  column: number;
  line: number;
  endColumn: number;
  endLine: number;
  message?: string;
}

export function analyze(input: AnalysisInput): AnalysisResponse {
  const { filePath, fileContent } = input;
  if (fileContent) {
    const sourceCode = parseSourceFile(fileContent, filePath);
    if (sourceCode) {
      return linter.analyze(sourceCode, input.rules, filePath);
    }
  }
  return EMPTY_RESPONSE;
}

export function analyzeTypeScript(input: TypeScriptAnalysisInput): AnalysisResponse {
  const { filePath, fileContent, rules, tsConfigs } = input;
  if (fileContent) {
    const sourceCode = parseTypeScriptSourceFile(fileContent, filePath, tsConfigs);
    if (sourceCode) {
      return linter.analyze(sourceCode, rules, filePath);
    }
  }
  return EMPTY_RESPONSE;
}
