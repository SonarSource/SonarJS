/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { ParseExceptionCode, buildSourceCode } from './parser';
import getHighlighting, { Highlight } from './runner/highlighter';
import getMetrics, { EMPTY_METRICS, getNosonarMetric, Metrics } from './runner/metrics';
import getCpdTokens, { CpdToken } from './runner/cpd';
import { SourceCode } from 'eslint';
import { HighlightedSymbol } from './runner/symbol-highlighter';
import { LinterWrapper, AdditionalRule } from './linter';
import { getContext } from './context';
import { hrtime } from 'process';

export const EMPTY_RESPONSE: AnalysisResponse = {
  issues: [],
  highlights: [],
  highlightedSymbols: [],
  metrics: EMPTY_METRICS,
  cpdTokens: [],
};

export interface AnalysisInput {
  filePath: string;
  fileType: FileType;
  fileContent: string | undefined;
  ignoreHeaderComments?: boolean;
  tsConfigs?: string[];
}

// eslint rule key
export interface Rule {
  key: string;
  // Currently we only have rules that accept strings, but configuration can be a JS object or a string.
  configurations: any[];
  fileTypeTarget: FileType;
}

export type FileType = 'MAIN' | 'TEST';

export interface AnalysisResponse {
  parsingError?: ParsingError;
  issues: Issue[];
  highlights?: Highlight[];
  highlightedSymbols?: HighlightedSymbol[];
  metrics?: Metrics;
  cpdTokens?: CpdToken[];
  perf?: Perf;
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

export interface Perf {
  parseTime: number;
  analysisTime: number;
}

export function analyzeJavaScript(input: AnalysisInput): AnalysisResponse {
  return analyze(input, 'js');
}

export function analyzeTypeScript(input: AnalysisInput): AnalysisResponse {
  return analyze(input, 'ts');
}

let linter: LinterWrapper;
const customRules: AdditionalRule[] = [];

export function initLinter(rules: Rule[], environments: string[] = [], globals: string[] = []) {
  console.log(`DEBUG initializing linter with ${rules.map(r => r.key)}`);
  linter = new LinterWrapper(rules, customRules, environments, globals);
}

export function loadCustomRuleBundle(bundlePath: string): string[] {
  const bundle = require(bundlePath);
  customRules.push(...bundle.rules);
  return bundle.rules.map((r: AdditionalRule) => r.ruleId);
}

function analyze(input: AnalysisInput, language: 'ts' | 'js'): AnalysisResponse {
  if (!linter) {
    throw new Error('Linter is undefined. Did you call /init-linter?');
  }
  const { result, duration: parseTime } = measureDuration(() => buildSourceCode(input, language));
  if (result instanceof SourceCode) {
    const { result: response, duration: analysisTime } = measureDuration(() =>
      analyzeFile(result, input),
    );
    return { ...response, perf: { parseTime, analysisTime } };
  } else {
    return {
      ...EMPTY_RESPONSE,
      parsingError: result,
    };
  }
}

function measureDuration<T>(f: () => T): { result: T; duration: number } {
  const start = hrtime.bigint();
  const result = f();
  const duration = Math.round(Number(hrtime.bigint() - start) / 1_000);
  return { result, duration };
}

function analyzeFile(sourceCode: SourceCode, input: AnalysisInput): AnalysisResponse {
  let issues: Issue[] = [];
  let symbolHighlighting;
  let cognitiveComplexity;
  let parsingError: ParsingError | undefined = undefined;
  try {
    ({ issues, symbolHighlighting, cognitiveComplexity } = linter.analyze(
      sourceCode,
      input.filePath,
      input.fileType,
    ));
  } catch (e) {
    // turns exceptions from TypeScript compiler into "parsing" errors
    if (e.stack.indexOf('typescript.js:') > -1) {
      parsingError = { message: e.message, code: ParseExceptionCode.FailingTypeScript };
    } else {
      throw e;
    }
  }
  if (getContext().sonarlint) {
    return { issues, parsingError, metrics: getNosonarMetric(sourceCode) };
  } else if (input.fileType === 'MAIN') {
    return {
      issues,
      parsingError,
      highlightedSymbols: symbolHighlighting,
      highlights: getHighlighting(sourceCode).highlights,
      metrics: getMetrics(sourceCode, !!input.ignoreHeaderComments, cognitiveComplexity),
      cpdTokens: getCpdTokens(sourceCode).cpdTokens,
    };
  } else {
    // for test file
    return {
      issues,
      parsingError,
      highlightedSymbols: symbolHighlighting,
      highlights: getHighlighting(sourceCode).highlights,
      metrics: getNosonarMetric(sourceCode),
    };
  }
}
