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
import type { SourceCode } from 'eslint';
import type estree from 'estree';
import type { Position } from 'estree';
import type { JsTsIssue } from '../../linter/issues/issue.js';
import { Linter, type LintResult } from '../../linter/linter.js';
import type { EmbeddedAnalysisInput, EmbeddedAnalysisOutput } from './analysis.js';
import { collectNclocLines } from '../../analysis/file-artifacts.js';
import { type ExtendedParseResult, type LanguageParser, build } from '../builder/build.js';
import { debug } from '../../../../../shared/src/helpers/logging.js';
import { extractSonarResolveCommentsFromJsTsComments } from '../../../common/sonar-resolve.js';
import type { SonarResolveComment } from '../../../contracts/analysis.js';
import { childrenOf } from '../../rules/helpers/ancestor.js';

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
 * The input must be fully sanitized (all fields required) before calling this function.
 *
 * @param input the sanitized analysis input (all fields required)
 * @param languageParser the parser for the language of the file containing the JS code
 * @returns the analysis output
 */
export async function analyzeEmbedded(
  input: EmbeddedAnalysisInput,
  languageParser: LanguageParser,
): Promise<EmbeddedAnalysisOutput> {
  debug(`Analyzing file "${input.filePath}"`);
  const extendedParseResults = build(input, languageParser);
  const aggregatedIssues: JsTsIssue[] = [];
  const aggregatedSuppressedIssues: NonNullable<EmbeddedAnalysisOutput['suppressedIssues']> = [];
  const aggregatedSonarResolveComments: SonarResolveComment[] = [];
  let ncloc: number[] = [];
  // Names bound at the top level (var/let/const/class/function) by classic script blocks seen so
  // far, in document order. Classic (non-module, non-deferred) <script> blocks of the same HTML
  // document share one global lexical/variable environment in real browsers, so a later classic
  // block writing to a name declared by an earlier one is not an implicit global.
  const sharedGlobalScopeNames = new Set<string>();
  for (const extendedParseResult of extendedParseResults) {
    const additionalSettings =
      extendedParseResult.sharesGlobalScope && sharedGlobalScopeNames.size > 0
        ? { precedingScriptGlobals: [...sharedGlobalScopeNames] }
        : undefined;
    const {
      issues,
      suppressedIssues,
      ncloc: singleNcLoc,
      sonarResolveComments: singleSonarResolveComments,
    } = analyzeSnippet(extendedParseResult, additionalSettings);
    ncloc = ncloc.concat(singleNcLoc);
    const { issues: filteredIssues, suppressedIssues: filteredSuppressedIssues } =
      filterSnippetIssues(extendedParseResult.sourceCode, { issues, suppressedIssues });
    aggregatedIssues.push(...filteredIssues);
    aggregatedSuppressedIssues.push(...filteredSuppressedIssues);
    aggregatedSonarResolveComments.push(...singleSonarResolveComments);
    if (extendedParseResult.sharesGlobalScope) {
      for (const name of collectTopLevelBindingNames(
        extendedParseResult.sourceCode.ast as estree.Program,
        extendedParseResult.sourceCode.visitorKeys,
      )) {
        sharedGlobalScopeNames.add(name);
      }
    }
  }
  return {
    issues: aggregatedIssues,
    ...(aggregatedSuppressedIssues.length > 0
      ? { suppressedIssues: aggregatedSuppressedIssues }
      : {}),
    metrics: { ncloc },
    ...(aggregatedSonarResolveComments.length > 0
      ? { sonarResolveComments: aggregatedSonarResolveComments }
      : {}),
  };
}

function analyzeSnippet(
  extendedParseResult: ExtendedParseResult,
  additionalSettings?: Record<string, unknown>,
) {
  const { issues, suppressedIssues } = Linter.lint(
    extendedParseResult,
    extendedParseResult.syntheticFilePath,
    'MAIN',
    'CHANGED',
    'DEFAULT',
    'js',
    undefined,
    undefined,
    additionalSettings ? { additionalSettings } : {},
  );
  const ncloc = collectNclocLines(extendedParseResult.sourceCode);
  const sonarResolveComments = extractSonarResolveCommentsFromJsTsComments(
    extendedParseResult.sourceCode.ast.comments ?? [],
  );
  return { issues, suppressedIssues, ncloc, sonarResolveComments };
}

/**
 * Collects the names bound at the top level of a script by "var", "let", "const", "class" and
 * named "function" declarations. In a classic (non-module) script, all of these become bindings
 * of the shared global scope, visible to other classic scripts of the same HTML document.
 *
 * A "var" declared inside a nested block (if/for/try/switch/...) at the top level of the script
 * also hoists to that shared scope, so such statements are additionally walked to collect any
 * "var" declaration they contain, stopping at function boundaries since those introduce their own
 * "var" scope. "let"/"const"/"class" declared inside a nested block stay block-scoped and are
 * correctly not collected there.
 */
function collectTopLevelBindingNames(
  program: estree.Program,
  visitorKeys: SourceCode.VisitorKeys,
): string[] {
  const names: string[] = [];
  for (const statement of program.body) {
    switch (statement.type) {
      case 'VariableDeclaration':
        for (const declarator of statement.declarations) {
          collectPatternNames(declarator.id, names);
        }
        break;
      case 'ClassDeclaration':
      case 'FunctionDeclaration':
        if (statement.id) {
          names.push(statement.id.name);
        }
        break;
      default:
        collectNestedVarNames(statement, visitorKeys, names);
        break;
    }
  }
  return names;
}

const FUNCTION_BOUNDARIES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

function collectNestedVarNames(
  node: estree.Node,
  visitorKeys: SourceCode.VisitorKeys,
  names: string[],
): void {
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const declarator of node.declarations) {
      collectPatternNames(declarator.id, names);
    }
  }
  if (FUNCTION_BOUNDARIES.has(node.type)) {
    return;
  }
  for (const child of childrenOf(node, visitorKeys)) {
    collectNestedVarNames(child, visitorKeys, names);
  }
}

function collectPatternNames(pattern: estree.Pattern, names: string[]): void {
  switch (pattern.type) {
    case 'Identifier':
      names.push(pattern.name);
      break;
    case 'ObjectPattern':
      for (const property of pattern.properties) {
        collectPatternNames(
          property.type === 'Property' ? (property.value as estree.Pattern) : property.argument,
          names,
        );
      }
      break;
    case 'ArrayPattern':
      for (const element of pattern.elements) {
        if (element) {
          collectPatternNames(element, names);
        }
      }
      break;
    case 'AssignmentPattern':
      collectPatternNames(pattern.left, names);
      break;
    case 'RestElement':
      collectPatternNames(pattern.argument, names);
      break;
  }
}

function filterSnippetIssues(sourceCode: SourceCode, { issues, suppressedIssues }: LintResult) {
  // Suppressed messages originate from the same lint messages, so they still need the embedded
  // host-range guard that drops false positives outside the extracted JS snippet.
  return {
    issues: removeNonJsIssues(sourceCode, issues),
    suppressedIssues: removeNonJsIssues(sourceCode, suppressedIssues),
  };
}

/**
 * Filters out issues outside of JS code.
 *
 * This is necessary because we patch the SourceCode object
 * to include the whole file in its properties outside its AST.
 * So rules that operate on SourceCode.text get flagged.
 */
function removeNonJsIssues<T extends Pick<JsTsIssue, 'line' | 'column'>>(
  sourceCode: SourceCode,
  issues: T[],
) {
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
