/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Location as IssueLocation } from './contracts/location.js';
import type { Location as ArtifactLocation } from './jsts/analysis/file-artifacts.js';
import type { UnserializedJsTsAnalysisOutput } from './jsts/analysis/analyzer.js';
import type { JsTsIssue } from './jsts/linter/issues/issue.js';
import { serializeInProtobufSafely } from './jsts/parsers/ast.js';
import type { FileResult } from './projectAnalysis.js';
import type { NormalizedAbsolutePath } from '../../shared/src/helpers/files.js';

const ECMASCRIPT_ONLY_LINE_TERMINATORS = /[\u2028\u2029]/u;
const ECMASCRIPT_LINE_ENDINGS = /\r\n|[\r\n\u2028\u2029]/gu;
const SCANNER_LINE_ENDINGS = /\r\n|[\r\n]/gu;

type Position = { line: number; column: number };
type FinalizableFileResult = FileResult | UnserializedJsTsAnalysisOutput;
type FinalizableSuccessResult = Exclude<FinalizableFileResult, { error: string }>;

export function finalizeFileResultForScanner(
  result: FinalizableFileResult,
  source: string,
  filePath: NormalizedAbsolutePath,
): FileResult {
  if ('error' in result) {
    return result;
  }

  const mapper = ECMASCRIPT_ONLY_LINE_TERMINATORS.test(source)
    ? new ScannerLocationMapper(source)
    : undefined;
  if (mapper) {
    alignFileResultWithMapper(result, mapper);
  }

  if ('unserializedAst' in result && result.unserializedAst) {
    const { unserializedAst, ...output } = result;
    const ast = serializeInProtobufSafely(
      unserializedAst,
      filePath,
      mapper ? mapper.position.bind(mapper) : undefined,
    );
    return ast ? { ast, ...output } : output;
  }

  return result;
}

function alignFileResultWithMapper(
  result: FinalizableSuccessResult,
  mapper: ScannerLocationMapper,
) {
  alignIssues(result, mapper);
  alignParsingErrors(result, mapper);
  alignArtifacts(result, mapper);
  alignMetrics(result, mapper);
  alignSonarResolveComments(result, mapper);
}

function alignIssues(result: FinalizableSuccessResult, mapper: ScannerLocationMapper) {
  for (const issue of result.issues) {
    if (issue.language !== 'css') {
      alignIssue(issue, mapper);
    }
  }
  for (const issue of result.suppressedIssues ?? []) {
    alignIssue(issue, mapper);
  }
}

function alignParsingErrors(result: FinalizableSuccessResult, mapper: ScannerLocationMapper) {
  if (!('parsingErrors' in result)) {
    return;
  }
  for (const error of result.parsingErrors ?? []) {
    if (error.language === 'css' || error.line === undefined) {
      continue;
    }
    if (error.column === undefined) {
      error.line = mapper.line(error.line);
    } else {
      const position = mapper.position(error.line, error.column);
      error.line = position.line;
      error.column = position.column;
    }
  }
}

function alignArtifacts(result: FinalizableSuccessResult, mapper: ScannerLocationMapper) {
  if ('highlights' in result) {
    for (const highlight of result.highlights ?? []) {
      alignArtifactLocation(highlight.location, mapper);
    }
  }
  if ('highlightedSymbols' in result) {
    for (const symbol of result.highlightedSymbols ?? []) {
      alignArtifactLocation(symbol.declaration, mapper);
      symbol.references.forEach(reference => alignArtifactLocation(reference, mapper));
    }
  }
  if ('cpdTokens' in result) {
    for (const token of result.cpdTokens ?? []) {
      alignArtifactLocation(token.location, mapper);
    }
  }
}

function alignMetrics(result: FinalizableSuccessResult, mapper: ScannerLocationMapper) {
  if (!result.metrics) {
    return;
  }
  result.metrics.ncloc = alignLines(result.metrics.ncloc, mapper);
  if ('commentLines' in result.metrics) {
    result.metrics.commentLines = alignLines(result.metrics.commentLines, mapper);
  }
  if ('nosonarLines' in result.metrics) {
    result.metrics.nosonarLines = alignLines(result.metrics.nosonarLines, mapper) ?? [];
  }
  if ('executableLines' in result.metrics) {
    result.metrics.executableLines = alignLines(result.metrics.executableLines, mapper);
  }
}

function alignSonarResolveComments(
  result: FinalizableSuccessResult,
  mapper: ScannerLocationMapper,
) {
  for (const comment of result.sonarResolveComments ?? []) {
    comment.line = mapper.line(comment.line);
  }
}

function alignIssue(issue: JsTsIssue, mapper: ScannerLocationMapper) {
  const start = mapper.position(issue.line, issue.column);
  issue.line = start.line;
  issue.column = start.column;

  if (issue.endLine !== undefined && issue.endColumn !== undefined) {
    const end = mapper.position(issue.endLine, issue.endColumn);
    issue.endLine = end.line;
    issue.endColumn = end.column;
  }

  if ('secondaryLocations' in issue && Array.isArray(issue.secondaryLocations)) {
    issue.secondaryLocations.forEach(location => alignIssueLocation(location, mapper));
  }
  if ('quickFixes' in issue && Array.isArray(issue.quickFixes)) {
    for (const quickFix of issue.quickFixes) {
      quickFix.edits.forEach(edit => alignIssueLocation(edit.loc, mapper));
    }
  }
}

function alignIssueLocation(location: IssueLocation, mapper: ScannerLocationMapper) {
  const start = mapper.position(location.line, location.column);
  const end = mapper.position(location.endLine, location.endColumn);
  location.line = start.line;
  location.column = start.column;
  location.endLine = end.line;
  location.endColumn = end.column;
}

function alignArtifactLocation(location: ArtifactLocation, mapper: ScannerLocationMapper) {
  const start = mapper.position(location.startLine, location.startCol);
  const end = mapper.position(location.endLine, location.endCol);
  location.startLine = start.line;
  location.startCol = start.column;
  location.endLine = end.line;
  location.endCol = end.column;
}

function alignLines(lines: number[] | undefined, mapper: ScannerLocationMapper) {
  return lines === undefined ? undefined : [...new Set(lines.map(line => mapper.line(line)))];
}

class ScannerLocationMapper {
  private readonly ecmascriptLineStarts: number[];
  private readonly scannerLineStarts: number[];

  constructor(private readonly source: string) {
    this.ecmascriptLineStarts = computeLineStarts(source, ECMASCRIPT_LINE_ENDINGS);
    this.scannerLineStarts = computeLineStarts(source, SCANNER_LINE_ENDINGS);
  }

  line(line: number) {
    return this.position(line, 0).line;
  }

  position(line: number, column: number): Position {
    if (line < 1 || line > this.ecmascriptLineStarts.length || column < 0) {
      return { line, column };
    }
    const offset = this.ecmascriptLineStarts[line - 1] + column;
    if (offset > this.source.length) {
      return { line, column };
    }
    const scannerLineIndex = findLineIndex(this.scannerLineStarts, offset);
    return {
      line: scannerLineIndex + 1,
      column: offset - this.scannerLineStarts[scannerLineIndex],
    };
  }
}

function computeLineStarts(source: string, lineEndings: RegExp) {
  const starts = [0];
  lineEndings.lastIndex = 0;
  for (let match = lineEndings.exec(source); match; match = lineEndings.exec(source)) {
    starts.push(lineEndings.lastIndex);
  }
  return starts;
}

function findLineIndex(lineStarts: number[], offset: number) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (lineStarts[middle] <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}
