/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { ParseExceptionCode, buildSourceCode, getFileContent } from './parser';
import getHighlighting, { Highlight } from './runner/highlighter';
import getMetrics, { EMPTY_METRICS, getNosonarMetric, Metrics } from './runner/metrics';
import getCpdTokens, { CpdToken } from './runner/cpd';
import { SourceCode } from 'eslint';
import { Position } from 'estree';
import { HighlightedSymbol } from './runner/symbol-highlighter';
import { LinterWrapper, AdditionalRule } from './linter';
import { getContext } from './context';
import { hrtime } from 'process';
import * as stylelint from 'stylelint';
import { QuickFix } from './quickfix';
import { rule as functionCalcNoInvalid } from './rules/stylelint/function-calc-no-invalid';
import { buildSourceCodesFromYaml, isParsingError } from './yaml';

export const EMPTY_RESPONSE: AnalysisResponse = {
  issues: [],
  highlights: [],
  highlightedSymbols: [],
  metrics: EMPTY_METRICS,
  cpdTokens: [],
};

export interface AnalysisInput {
  filePath: string;
  fileContent: string | undefined;
}

export interface CssAnalysisInput extends AnalysisInput {
  rules: StylelintRule[];
}

export interface StylelintRule {
  key: string;
  configurations: any[];
}

export interface TsConfigBasedAnalysisInput extends AnalysisInput {
  fileType: FileType;
  ignoreHeaderComments?: boolean;
  tsConfigs: string[];
}

export interface ProgramBasedAnalysisInput extends AnalysisInput {
  programId: string;
  fileType: FileType;
  ignoreHeaderComments?: boolean;
}

export type JsTsAnalysisInput = TsConfigBasedAnalysisInput | ProgramBasedAnalysisInput;

export interface Rule {
  // eslint rule key
  key: string;
  // Currently we only have rules that accept strings, but configuration can be a JS object or a string.
  configurations: any[];
  fileTypeTarget: FileType[];
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
  quickFixes?: QuickFix[];
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

export function analyzeJavaScript(input: TsConfigBasedAnalysisInput): Promise<AnalysisResponse> {
  return Promise.resolve(analyze(input, 'js'));
}

export function analyzeTypeScript(input: TsConfigBasedAnalysisInput): Promise<AnalysisResponse> {
  return Promise.resolve(analyze(input, 'ts'));
}

export function analyzeYaml(input: TsConfigBasedAnalysisInput): Promise<AnalysisResponse> {
  checkLinterState();
  const sourceCodesOrError = buildSourceCodesFromYaml(input.filePath);
  if (isParsingError(sourceCodesOrError)) {
    const parsingError = sourceCodesOrError;
    return Promise.resolve({
      ...EMPTY_RESPONSE,
      parsingError,
    });
  }
  const sourceCodes = sourceCodesOrError;
  const aggregatedIssues: Issue[] = [];
  for (const sourceCode of sourceCodes) {
    const { issues } = linter.analyze(sourceCode, input.filePath, input.fileType);
    const filteredIssues = removeYamlIssues(sourceCode, issues);
    aggregatedIssues.push(...filteredIssues);
  }
  return Promise.resolve({ issues: aggregatedIssues });

  /**
   * Filters out issues outside of JS code.
   *
   * This is necessary because we patch the SourceCode object
   * to include all the YAML files in its properties outside of its AST.
   * So rules that operate on SourceCode.text get flagged.
   */
  function removeYamlIssues(sourceCode: SourceCode, issues: Issue[]) {
    const [jsStart, jsEnd] = sourceCode.ast.range.map(offset => sourceCode.getLocFromIndex(offset));
    return issues.filter(issue => {
      const issueStart = { line: issue.line, column: issue.column };
      return isBeforeOrEqual(jsStart, issueStart) && isBeforeOrEqual(issueStart, jsEnd);
    });

    function isBeforeOrEqual(a: Position, b: Position) {
      if (a.line < b.line) {
        return true;
      } else if (a.line > b.line) {
        return false;
      } else {
        return a.column <= b.column;
      }
    }
  }
}

export function analyzeCss(input: CssAnalysisInput): Promise<AnalysisResponse> {
  const { filePath, fileContent, rules } = input;
  const code = typeof fileContent == 'string' ? fileContent : getFileContent(filePath);
  const config = createStylelintConfig(rules);
  const options = {
    code,
    codeFilename: filePath,
    config,
  };
  stylelint.rules[functionCalcNoInvalid.ruleName] = functionCalcNoInvalid.rule;
  return stylelint
    .lint(options)
    .then(result => ({ issues: fromStylelintToSonarIssues(result.results, filePath) }));
}

function createStylelintConfig(rules: StylelintRule[]): stylelint.Config {
  const configRules: stylelint.ConfigRules = {};
  for (const { key, configurations } of rules) {
    if (configurations.length === 0) {
      configRules[key] = true;
    } else {
      configRules[key] = configurations;
    }
  }
  return { customSyntax: 'postcss-syntax', rules: configRules };
}

function fromStylelintToSonarIssues(results: stylelint.LintResult[], filePath: string): Issue[] {
  const issues: Issue[] = [];
  // we should have only one element in 'results' as we are analyzing only 1 file
  results.forEach(result => {
    // to avoid reporting on "fake" source like <input ccs 1>
    if (result.source !== filePath) {
      console.log(
        `DEBUG For file [${filePath}] received issues with [${result.source}] as a source. They will not be reported.`,
      );
      return;
    }
    result.warnings.forEach(warning =>
      issues.push({
        line: warning.line,
        column: warning.column,
        message: warning.text,
        ruleId: warning.rule,
        secondaryLocations: [],
      }),
    );
  });
  return issues;
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

function analyze(
  input: TsConfigBasedAnalysisInput | ProgramBasedAnalysisInput,
  language: 'ts' | 'js',
): AnalysisResponse {
  checkLinterState();
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

function checkLinterState() {
  if (!linter) {
    throw new Error('Linter is undefined. Did you call /init-linter?');
  }
}

function measureDuration<T>(f: () => T): { result: T; duration: number } {
  const start = hrtime.bigint();
  const result = f();
  const duration = Math.round(Number(hrtime.bigint() - start) / 1_000);
  return { result, duration };
}

function analyzeFile(
  sourceCode: SourceCode,
  input: TsConfigBasedAnalysisInput | ProgramBasedAnalysisInput,
) {
  try {
    const { issues, highlightedSymbols, cognitiveComplexity } = linter.analyze(
      sourceCode,
      input.filePath,
      input.fileType,
    );
    if (getContext().sonarlint) {
      return { issues, metrics: getNosonarMetric(sourceCode) };
    } else if (input.fileType === 'MAIN') {
      return {
        issues,
        highlightedSymbols,
        highlights: getHighlighting(sourceCode).highlights,
        metrics: getMetrics(sourceCode, !!input.ignoreHeaderComments, cognitiveComplexity),
        cpdTokens: getCpdTokens(sourceCode).cpdTokens,
      };
    } else {
      // for test file
      return {
        issues,
        highlightedSymbols,
        highlights: getHighlighting(sourceCode).highlights,
        metrics: getNosonarMetric(sourceCode),
      };
    }
  } catch (e) {
    // turns exceptions from TypeScript compiler into "parsing" errors
    if (e.stack.indexOf('typescript.js:') > -1) {
      const parsingError = { message: e.message, code: ParseExceptionCode.FailingTypeScript };
      return { issues: [], parsingError };
    } else {
      throw e;
    }
  }
}
