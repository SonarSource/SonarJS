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
import { SourceCode } from 'eslint';
import { Position } from 'estree';
import { getLinter, Issue, LinterWrapper } from '../../linter';
import { buildSourceCodes, ExtendedSourceCode, LanguageParser } from '../builder';
import { EmbeddedAnalysisInput, EmbeddedAnalysisOutput } from './analysis';
import { debug } from '@sonar/shared';
import { measureDuration } from '../../monitoring';
import { findNcloc } from '../../linter/visitors/metrics/ncloc';

/**
 * Analyzes a file containing JS snippets
 *
 * Analyzing embedded JS is part of analyzing inline JavaScript code
 * within various file formats: YAML, HTML, etc. The function first starts by parsing
 * the whole file to validate its syntax and to get in return an abstract syntax
 * tree. This abstract syntax tree is then used to extract embedded JavaScript
 * code. As files might embed several JavaScript snippets, the function
 * builds an ESLint SourceCode instance for each snippet using the same utility
 * as for building source code for regular JavaScript analysis inputs. However,
 * since a file can potentially produce multiple ESLint SourceCode instances,
 * the function stops to the first JavaScript parsing error and returns it without
 * considering any other. If all abstract syntax trees are valid, the function
 * then proceeds with linting each of them, aggregates, and returns the results.
 *
 * The analysis requires that global linter wrapper is initialized.
 *
 * @param input the analysis input
 * @param languageParser the parser for the language of the file containing the JS code
 * @returns the analysis output
 */
export function analyzeEmbedded(
  input: EmbeddedAnalysisInput,
  languageParser: LanguageParser,
): EmbeddedAnalysisOutput {
  debug(`Analyzing file "${input.filePath}" with linterId "${input.linterId}"`);
  const linter = getLinter(input.linterId);
  const building = () => buildSourceCodes(input, languageParser);
  const { result: extendedSourceCodes, duration: parseTime } = measureDuration(building);
  const analysis = () => analyzeFile(linter, extendedSourceCodes);
  const { result: output, duration: analysisTime } = measureDuration(analysis);

  return {
    ...output,
    perf: { parseTime, analysisTime },
  };
}

/**
 * Extracted logic from analyzeEmbedded() so we can compute metrics
 *
 * @param linter
 * @param extendedSourceCodes
 * @returns
 */
function analyzeFile(linter: LinterWrapper, extendedSourceCodes: ExtendedSourceCode[]) {
  const aggregatedIssues: Issue[] = [];
  const aggregatedUcfgPaths: string[] = [];
  let ncloc: number[] = [];
  for (const extendedSourceCode of extendedSourceCodes) {
    const { issues, ucfgPaths, ncloc: singleNcLoc } = analyzeSnippet(linter, extendedSourceCode);
    ncloc = ncloc.concat(singleNcLoc);
    const filteredIssues = removeNonJsIssues(extendedSourceCode, issues);
    aggregatedIssues.push(...filteredIssues);
    aggregatedUcfgPaths.push(...ucfgPaths);
  }
  return {
    issues: aggregatedIssues,
    ucfgPaths: aggregatedUcfgPaths,
    metrics: { ncloc },
  };

  function analyzeSnippet(linter: LinterWrapper, extendedSourceCode: ExtendedSourceCode) {
    const { issues, ucfgPaths } = linter.lint(
      extendedSourceCode,
      extendedSourceCode.syntheticFilePath,
      'MAIN',
    );
    const ncloc = findNcloc(extendedSourceCode);
    return { issues, ucfgPaths, ncloc };
  }

  /**
   * Filters out issues outside of JS code.
   *
   * This is necessary because we patch the SourceCode object
   * to include the whole file in its properties outside its AST.
   * So rules that operate on SourceCode.text get flagged.
   */
  function removeNonJsIssues(sourceCode: SourceCode, issues: Issue[]) {
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
