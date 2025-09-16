/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { SourceCode } from 'eslint';
import type { Position } from 'estree';
import { Issue } from '../../linter/issues/issue.js';
import { Linter } from '../../linter/linter.js';
import { CompleteEmbeddedAnalysisInput, EmbeddedAnalysisOutput } from './analysis.js';
import { findNcloc } from '../../linter/visitors/metrics/ncloc.js';
import { build, ExtendedParseResult, LanguageParser } from '../builder/build.js';
import { debug } from '../../../../shared/src/helpers/logging.js';
import { shouldIgnoreFile } from '../../../../shared/src/helpers/filter/filter.js';
import { setGlobalConfiguration } from '../../../../shared/src/helpers/configuration.js';

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
export async function analyzeEmbedded(
  input: CompleteEmbeddedAnalysisInput,
  languageParser: LanguageParser,
): Promise<EmbeddedAnalysisOutput> {
  const { filePath, fileContent, configuration } = input;
  setGlobalConfiguration(configuration);
  if (await shouldIgnoreFile({ filePath, fileContent })) {
    return { issues: [], metrics: { ncloc: [] } };
  }
  debug(`Analyzing file "${input.filePath}"`);
  const extendedParseResults = build(input, languageParser);
  const aggregatedIssues: Issue[] = [];
  const aggregatedUcfgPaths: string[] = [];
  let ncloc: number[] = [];
  for (const extendedParseResult of extendedParseResults) {
    const { issues, ucfgPaths, ncloc: singleNcLoc } = analyzeSnippet(extendedParseResult);
    ncloc = ncloc.concat(singleNcLoc);
    const filteredIssues = removeNonJsIssues(extendedParseResult.sourceCode, issues);
    aggregatedIssues.push(...filteredIssues);
    aggregatedUcfgPaths.push(...ucfgPaths);
  }
  return {
    issues: aggregatedIssues,
    ucfgPaths: aggregatedUcfgPaths,
    metrics: { ncloc },
  };
}

function analyzeSnippet(extendedParseResult: ExtendedParseResult) {
  const { issues, ucfgPaths } = Linter.lint(
    extendedParseResult,
    extendedParseResult.syntheticFilePath,
    'MAIN',
  );
  const ncloc = findNcloc(extendedParseResult.sourceCode);
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
}

function isBeforeOrEqual(a: Position, b: Position) {
  if (a.line === b.line) {
    return a.column <= b.column;
  } else {
    return a.line < b.line;
  }
}
