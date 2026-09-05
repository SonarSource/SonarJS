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
  // Names bound at the top level (var/let/const/class/function) by each snippet, contributed to the
  // page's shared global scope. Classic (non-module) <script> blocks of the same HTML document
  // share one global lexical/variable environment in real browsers, so a block writing to a name
  // declared by another one is not an implicit global. "defer" and "async" have no effect on inline
  // scripts, so they do not exclude a block from that shared environment. A module block has an
  // isolated module scope and therefore contributes nothing.
  const contributedNamesPerSnippet = extendedParseResults.map(extendedParseResult =>
    extendedParseResult.scriptKind === 'classic'
      ? collectTopLevelBindingNames(
          extendedParseResult.sourceCode.ast as estree.Program,
          extendedParseResult.sourceCode.visitorKeys,
        )
      : [],
  );
  // Module scripts are always deferred, so they run after every inline classic block of the
  // document and see the names of all of them, whatever the source order.
  const allClassicNames = new Set(contributedNamesPerSnippet.flat());
  // Names a classic block can see: only those contributed by strictly preceding classic blocks.
  const precedingClassicNames = new Set<string>();
  for (const [index, extendedParseResult] of extendedParseResults.entries()) {
    const visibleNames = sharedGlobalScopeNamesFor(
      extendedParseResult.scriptKind,
      precedingClassicNames,
      allClassicNames,
    );
    const additionalSettings =
      visibleNames.length > 0 ? { precedingScriptGlobals: visibleNames } : undefined;
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
    for (const name of contributedNamesPerSnippet[index]) {
      precedingClassicNames.add(name);
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

/**
 * Returns the shared global scope names visible to a snippet, given the names contributed by the
 * classic script blocks preceding it in document order and the names contributed by all of them.
 *
 * A snippet that is not an inline HTML script (YAML, ...) has no such shared scope at all.
 */
function sharedGlobalScopeNamesFor(
  scriptKind: ExtendedParseResult['scriptKind'],
  precedingClassicNames: Set<string>,
  allClassicNames: Set<string>,
): string[] {
  switch (scriptKind) {
    case 'classic':
      return [...precedingClassicNames];
    case 'module':
      return [...allClassicNames];
    default:
      return [];
  }
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
 * also hoists to that shared scope, and so does the name of a "function" declared inside such a
 * block (Annex B function hoisting in sloppy mode). Those statements are therefore additionally
 * walked to collect both kinds of name. "let"/"const"/"class" declared inside a nested block stay
 * block-scoped and are correctly not collected there.
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
        collectNestedHoistedNames(statement, visitorKeys, names);
        break;
    }
  }
  return names;
}

/**
 * Nodes introducing their own "var" scope: a "var" declaration or a block-nested "function"
 * declaration inside one of them hoists to that node, not to the enclosing script scope. A class
 * static block is such a scope too, even though it is not a function.
 */
const VAR_SCOPE_BOUNDARIES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'StaticBlock',
]);

function collectNestedHoistedNames(
  node: estree.Node,
  visitorKeys: SourceCode.VisitorKeys,
  names: string[],
): void {
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const declarator of node.declarations) {
      collectPatternNames(declarator.id, names);
    }
  } else if (node.type === 'FunctionDeclaration' && node.id) {
    // Per Annex B sloppy-mode semantics, the name of a function declared inside a block hoists to
    // the enclosing "var" scope, hence to the script's shared global scope here.
    names.push(node.id.name);
  }
  if (VAR_SCOPE_BOUNDARIES.has(node.type)) {
    return;
  }
  for (const child of childrenOf(node, visitorKeys)) {
    collectNestedHoistedNames(child, visitorKeys, names);
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
