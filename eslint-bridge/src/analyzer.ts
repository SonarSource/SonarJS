/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import {
  Parse,
  parseJavaScriptSourceFile,
  parseTypeScriptSourceFile,
  parseVueSourceFile,
  ParseExceptionCode,
} from './parser';
import getHighlighting, { Highlight } from './runner/highlighter';
import getMetrics, { EMPTY_METRICS, Metrics } from './runner/metrics';
import getCpdTokens, { CpdToken } from './runner/cpd';
import { SourceCode } from 'eslint';
import {
  HighlightedSymbol,
  rule as symbolHighlightingRule,
  symbolHighlightingRuleId,
} from './runner/symbol-highlighter';
import * as fs from 'fs';
import { rules as sonarjsRules } from 'eslint-plugin-sonarjs';
import { LinterWrapper, AdditionalRule } from './linter';

const COGNITIVE_COMPLEXITY_RULE_ID = 'internal-cognitive-complexity';

export const EMPTY_RESPONSE: AnalysisResponse = {
  issues: [],
  highlights: [],
  highlightedSymbols: [],
  metrics: EMPTY_METRICS,
  cpdTokens: [],
};

export const SYMBOL_HIGHLIGHTING_RULE: AdditionalRule = {
  ruleId: symbolHighlightingRuleId,
  ruleModule: symbolHighlightingRule,
  ruleConfig: [],
};

export const COGNITIVE_COMPLEXITY_RULE: AdditionalRule = {
  ruleId: COGNITIVE_COMPLEXITY_RULE_ID,
  ruleModule: sonarjsRules['cognitive-complexity'],
  ruleConfig: ['metric'],
};

export interface AnalysisInput {
  filePath: string;
  fileContent: string | undefined;
  ignoreHeaderComments?: boolean;
  tsConfigs?: string[];
}

// eslint rule key
export interface Rule {
  key: string;
  // Currently we only have rules that accept strings, but configuration can be a JS object or a string.
  configurations: any[];
}

export interface AnalysisResponse {
  parsingError?: ParsingError;
  issues: Issue[];
  highlights: Highlight[];
  highlightedSymbols: HighlightedSymbol[];
  metrics: Metrics;
  cpdTokens: CpdToken[];
}

export interface ParsingError {
  line?: number;
  message: string;
  code: ParseExceptionCode;
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
  return analyze(
    input,
    input.filePath.endsWith('.vue') ? parseVueSourceFile : parseJavaScriptSourceFile,
  );
}

export function analyzeTypeScript(input: AnalysisInput): AnalysisResponse {
  return analyze(input, parseTypeScriptSourceFile);
}

function getFileContent(filePath: string) {
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  return stripBom(fileContent);
}

function stripBom(s: string) {
  if (s.charCodeAt(0) === 0xfeff) {
    return s.slice(1);
  }
  return s;
}

let linter: LinterWrapper;

export function initLinter(rules: Rule[]) {
  linter = new LinterWrapper(rules, SYMBOL_HIGHLIGHTING_RULE, COGNITIVE_COMPLEXITY_RULE);
}

function analyze(input: AnalysisInput, parse: Parse): AnalysisResponse {
  let fileContent = input.fileContent;
  if (!fileContent) {
    fileContent = getFileContent(input.filePath);
  }
  if (!linter) {
    throw new Error('Linter is undefined. Did you call /init-linter?');
  }
  const result = parse(fileContent, input.filePath, input.tsConfigs);
  if (result instanceof SourceCode) {
    return analyzeFile(result, input);
  } else {
    return {
      ...EMPTY_RESPONSE,
      parsingError: result,
    };
  }
}

function analyzeFile(sourceCode: SourceCode, input: AnalysisInput) {
  const issues = linter.analyze(sourceCode, input.filePath).issues;
  return {
    issues,
    highlightedSymbols: getHighlightedSymbols(issues),
    highlights: getHighlighting(sourceCode).highlights,
    metrics: getMetrics(sourceCode, !!input.ignoreHeaderComments, getCognitiveComplexity(issues)),
    cpdTokens: getCpdTokens(sourceCode).cpdTokens,
  };
}

// exported for testing
export function getHighlightedSymbols(issues: Issue[]) {
  const issue = findAndRemoveFirstIssue(issues, symbolHighlightingRuleId);
  if (issue) {
    return JSON.parse(issue.message);
  } else {
    console.log('DEBUG Failed to retrieve symbol highlighting from analysis results');
    return [];
  }
}

// exported for testing
export function getCognitiveComplexity(issues: Issue[]) {
  const issue = findAndRemoveFirstIssue(issues, COGNITIVE_COMPLEXITY_RULE_ID);
  if (issue && !isNaN(Number(issue.message))) {
    return Number(issue.message);
  } else {
    console.log('DEBUG Failed to retrieve cognitive complexity metric from analysis results');
    return 0;
  }
}

function findAndRemoveFirstIssue(issues: Issue[], ruleId: string) {
  for (const issue of issues) {
    if (issue.ruleId === ruleId) {
      const index = issues.indexOf(issue);
      issues.splice(index, 1);
      return issue;
    }
  }
  return undefined;
}
