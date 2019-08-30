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
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile, Parse } from "./parser";
import getHighlighting, { Highlight } from "./runner/highlighter";
import getMetrics, { Metrics, EMPTY_METRICS } from "./runner/metrics";
import getCpdTokens, { CpdToken } from "./runner/cpd";
import * as linter from "./linter";

const EMPTY_RESPONSE: AnalysisResponse = {
  issues: [],
  highlights: [],
  metrics: EMPTY_METRICS,
  cpdTokens: [],
};

export interface AnalysisInput {
  filePath: string;
  fileContent: string;
  rules: Rule[];
  tsConfigs?: string[];
}

// eslint rule key
export interface Rule {
  key: string;
  // Currently we only have rules that accept strings, but configuration can be a JS object or a string.
  configurations: any[];
}

export interface AnalysisResponse {
  issues: Issue[];
  highlights: Highlight[];
  metrics: Metrics;
  cpdTokens: CpdToken[];
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

export function analyzeJavaScript(input: AnalysisInput): AnalysisResponse {
  return analyze(input, parseJavaScriptSourceFile);
}

export function analyzeTypeScript(input: AnalysisInput): AnalysisResponse {
  return analyze(input, parseTypeScriptSourceFile);
}

function analyze(input: AnalysisInput, parse: Parse): AnalysisResponse {
  if (input.fileContent) {
    const sourceCode = parse(input.fileContent, input.filePath, input.tsConfigs);
    if (sourceCode) {
      return {
        issues: linter.analyze(sourceCode, input.rules, input.filePath).issues,
        highlights: getHighlighting(sourceCode).highlights,
        metrics: getMetrics(sourceCode),
        cpdTokens: getCpdTokens(sourceCode).cpdTokens,
      };
    }
  }
  return EMPTY_RESPONSE;
}
