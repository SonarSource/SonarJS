/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type { AST as EslintAST, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { AST as VueAST } from 'vue-eslint-parser';
import { visit } from '../ast/visit.js';

/**
 * A metric location
 *
 * @param startLine the starting line of the metric
 * @param startCol the starting column of the metric
 * @param endLine the ending line of the metric
 * @param endCol the ending column of the metric
 */
export interface Location {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

/**
 * A copy-paste detector token (cpd)
 *
 * A cpd token is used by SonarQube to compute code duplication
 * within a code base. It relies on a token location as well as
 * an image, that is, the token value except for string literal
 * which is anonymised to extend the scope of what a duplicated
 * code pattern can be.
 *
 * @param location the token location
 * @param image the token
 */
export interface CpdToken {
  location: Location;
  image: string;
}

/**
 * Metrics of the source code
 *
 * @param ncloc the line numbers of physical code
 * @param commentLines the line numbers of comments
 * @param nosonarLines the line numbers of NOSONAR comments
 * @param executableLines the line numbers of executable code
 * @param functions the number of functions
 * @param statements the number of statements
 * @param classes the number of classes
 * @param complexity the cyclomatic complexity
 * @param cognitiveComplexity the cognitive complexity
 */
export interface Metrics {
  ncloc?: number[];
  commentLines?: number[];
  nosonarLines: number[];
  executableLines?: number[];
  functions?: number;
  statements?: number;
  classes?: number;
  complexity?: number;
  cognitiveComplexity?: number;
}

/**
 * A syntax highlight
 *
 * A syntax highlight is used by SonarQube to display a source code
 * with syntax highlighting.
 *
 * @param location the highlight location
 * @param textType the highlight type
 */
export interface SyntaxHighlight {
  location: Location;
  textType: TextType;
}

/**
 * Denotes a highlight type of a token
 *
 * The set of possible values for a token highlight is defined by SonarQube, which
 * uses this value to decide how to highlight a token.
 */
export type TextType = 'CONSTANT' | 'COMMENT' | 'STRUCTURED_COMMENT' | 'KEYWORD' | 'STRING';

/**
 * A symbol highlight
 *
 * @param declaration the location where the symbol is declared
 * @param references the locations where the symbol is referenced
 */
export interface SymbolHighlight {
  declaration: Location;
  references: Location[];
}

/**
 * Adds the line numbers within a range into a set
 * @param startLine the lower bound
 * @param endLine the upper bound
 * @param lines the set of line numbers to extend
 */
export function addLines(startLine: number, endLine: number, lines: Set<number>) {
  for (let line = startLine; line <= endLine; line++) {
    lines.add(line);
  }
}

/**
 * Converts an ESLint location into a metric location
 * @param loc the ESLint location to convert
 * @returns the converted location
 */
export function convertLocation(loc: estree.SourceLocation): Location {
  return {
    startLine: loc.start.line,
    startCol: loc.start.column,
    endLine: loc.end.line,
    endCol: loc.end.column,
  };
}

/**
 * Extracts comments and tokens from an ESLint source code
 *
 * The returned extracted comments includes also those from
 * the template section of a Vue.js Single File Component.
 *
 * @param sourceCode the source code to extract from
 * @returns the extracted tokens and comments
 */
export function extractTokensAndComments(sourceCode: SourceCode): {
  tokens: VueAST.Token[];
  comments: VueAST.Token[];
} {
  const ast = sourceCode.ast as VueAST.ESLintProgram;
  const tokens = [...(ast.tokens ?? [])];
  const comments = [...(ast.comments ?? [])];
  if (ast.templateBody) {
    const { templateBody } = ast;
    tokens.push(...templateBody.tokens);
    comments.push(...templateBody.comments);
  }
  return { tokens, comments };
}

const EXECUTABLE_NODES = new Set([
  'ExpressionStatement',
  'IfStatement',
  'LabeledStatement',
  'BreakStatement',
  'ContinueStatement',
  'WithStatement',
  'SwitchStatement',
  'ReturnStatement',
  'ThrowStatement',
  'TryStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'DebuggerStatement',
  'VariableDeclaration',
  'ForOfStatement',
]);

const FUNCTION_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

const STATEMENT_NODES = new Set([
  'VariableDeclaration',
  'EmptyStatement',
  'ExpressionStatement',
  'IfStatement',
  'DoWhileStatement',
  'WhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'ContinueStatement',
  'BreakStatement',
  'ReturnStatement',
  'WithStatement',
  'SwitchStatement',
  'ThrowStatement',
  'TryStatement',
  'DebuggerStatement',
]);

const CLASS_NODES = new Set(['ClassDeclaration', 'ClassExpression']);

const LOOP_NODES = [
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
];
const CONDITIONAL_NODES = ['IfStatement', 'ConditionalExpression', 'SwitchCase'];
const COMPLEXITY_NODES = new Set([
  ...CONDITIONAL_NODES,
  ...FUNCTION_NODES,
  ...LOOP_NODES,
  'LogicalExpression',
]);

/**
 * A comment marker to tell SonarQube to ignore any issue on the same line
 * as the one with a comment whose text is `NOSONAR` (case-insensitive).
 */
const NOSONAR = 'NOSONAR';

interface MainFileArtifacts {
  metrics: Metrics;
  cpdTokens: CpdToken[];
  highlights: SyntaxHighlight[];
  highlightedSymbols: SymbolHighlight[];
}

interface TestFileArtifacts {
  metrics: Metrics;
  highlights: SyntaxHighlight[];
  highlightedSymbols: SymbolHighlight[];
}

interface CollectArtifactsOptions {
  includeStructuralMetrics: boolean;
  includeCommentLines: boolean;
  includeNoSonar: boolean;
  includeNcloc: boolean;
  includeHighlights: boolean;
  includeSymbolHighlights: boolean;
  includeCpdTokens: boolean;
  ignoreHeaderComments: boolean;
}

interface CollectedArtifacts {
  commentLines: number[];
  nosonarLines: number[];
  ncloc: number[];
  executableLines: number[];
  functions: number;
  statements: number;
  classes: number;
  complexity: number;
  highlights: SyntaxHighlight[];
  highlightedSymbols: SymbolHighlight[];
  cpdTokens: CpdToken[];
}

interface NclocState {
  withinStyle: boolean;
  withinComment: boolean;
}

/**
 * Computes all main-file analysis artifacts while sharing AST/token/comment passes.
 */
export function collectMainFileArtifacts(
  sourceCode: SourceCode,
  ignoreHeaderComments: boolean,
  cognitiveComplexity = 0,
): MainFileArtifacts {
  const collected = collectArtifacts(sourceCode, {
    includeStructuralMetrics: true,
    includeCommentLines: true,
    includeNoSonar: true,
    includeNcloc: true,
    includeHighlights: true,
    includeSymbolHighlights: true,
    includeCpdTokens: true,
    ignoreHeaderComments,
  });

  return {
    metrics: {
      ncloc: collected.ncloc,
      commentLines: collected.commentLines,
      nosonarLines: collected.nosonarLines,
      executableLines: collected.executableLines,
      functions: collected.functions,
      statements: collected.statements,
      classes: collected.classes,
      complexity: collected.complexity,
      cognitiveComplexity,
    },
    cpdTokens: collected.cpdTokens,
    highlights: collected.highlights,
    highlightedSymbols: collected.highlightedSymbols,
  };
}

export function collectTestFileArtifacts(
  sourceCode: SourceCode,
  reportNclocForTestFiles: boolean,
): TestFileArtifacts {
  const collected = collectArtifacts(sourceCode, {
    includeStructuralMetrics: false,
    includeCommentLines: false,
    includeNoSonar: true,
    includeNcloc: reportNclocForTestFiles,
    includeHighlights: true,
    includeSymbolHighlights: true,
    includeCpdTokens: false,
    ignoreHeaderComments: false,
  });

  return {
    metrics: reportNclocForTestFiles
      ? { nosonarLines: collected.nosonarLines, ncloc: collected.ncloc }
      : { nosonarLines: collected.nosonarLines },
    highlights: collected.highlights,
    highlightedSymbols: collected.highlightedSymbols,
  };
}

export function collectCommentMetrics(sourceCode: SourceCode, ignoreHeaderComments: boolean) {
  const collected = collectArtifacts(sourceCode, {
    includeStructuralMetrics: false,
    includeCommentLines: true,
    includeNoSonar: true,
    includeNcloc: false,
    includeHighlights: false,
    includeSymbolHighlights: false,
    includeCpdTokens: false,
    ignoreHeaderComments,
  });

  return {
    commentLines: collected.commentLines,
    nosonarLines: collected.nosonarLines,
  };
}

export function collectNoSonarMetrics(sourceCode: SourceCode) {
  const collected = collectArtifacts(sourceCode, {
    includeStructuralMetrics: false,
    includeCommentLines: false,
    includeNoSonar: true,
    includeNcloc: false,
    includeHighlights: false,
    includeSymbolHighlights: false,
    includeCpdTokens: false,
    ignoreHeaderComments: false,
  });

  return { nosonarLines: collected.nosonarLines };
}

export function collectNclocLines(sourceCode: SourceCode) {
  const collected = collectArtifacts(sourceCode, {
    includeStructuralMetrics: false,
    includeCommentLines: false,
    includeNoSonar: false,
    includeNcloc: true,
    includeHighlights: false,
    includeSymbolHighlights: false,
    includeCpdTokens: false,
    ignoreHeaderComments: false,
  });

  return collected.ncloc;
}

function collectArtifacts(
  sourceCode: SourceCode,
  options: CollectArtifactsOptions,
): CollectedArtifacts {
  const executableLines = new Set<number>();
  const ncloc = new Set<number>();
  const commentLines = new Set<number>();
  const nosonarLines = new Set<number>();

  const highlights: SyntaxHighlight[] = [];
  const bracesAndTagsHighlights: SymbolHighlight[] = [];
  const cpdTokens: CpdToken[] = [];

  const variables = new Set<Scope.Variable>();
  const jsxTokens = new Set<EslintAST.Token>();
  const importTokens = new Set<EslintAST.Token>();
  const requireTokens = new Set<EslintAST.Token>();

  let functions = 0;
  let statements = 0;
  let classes = 0;
  let complexity = 0;

  const needsAstVisit =
    options.includeStructuralMetrics || options.includeSymbolHighlights || options.includeCpdTokens;

  if (needsAstVisit) {
    visit(sourceCode, node => {
      if (options.includeStructuralMetrics) {
        if (EXECUTABLE_NODES.has(node.type) && node.loc) {
          executableLines.add(node.loc.start.line);
        }
        if (FUNCTION_NODES.has(node.type)) {
          functions++;
        }
        if (STATEMENT_NODES.has(node.type)) {
          statements++;
        }
        if (CLASS_NODES.has(node.type)) {
          classes++;
        }
        if (COMPLEXITY_NODES.has(node.type)) {
          complexity++;
        }
      }

      if (options.includeSymbolHighlights) {
        for (const variable of sourceCode.getDeclaredVariables(node)) {
          variables.add(variable);
        }
      }

      if (options.includeCpdTokens) {
        collectCpdExclusions(
          node as TSESTree.Node,
          sourceCode,
          jsxTokens,
          importTokens,
          requireTokens,
        );
      }
    });
  }

  const needsTokenLoop =
    options.includeHighlights ||
    options.includeSymbolHighlights ||
    options.includeNcloc ||
    options.includeCpdTokens;
  const needsCommentLoop =
    options.includeHighlights || options.includeCommentLines || options.includeNoSonar;

  if (needsTokenLoop || needsCommentLoop) {
    const { tokens, comments } = extractTokensAndComments(sourceCode);
    const jsTokensCount = sourceCode.ast.tokens?.length ?? 0;

    if (needsTokenLoop) {
      const openCurlyBracesStack: VueAST.Token[] = [];
      const openHtmlTagsStack: VueAST.Token[] = [];
      const nclocState: NclocState = {
        withinStyle: false,
        withinComment: false,
      };

      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];

        if (options.includeHighlights) {
          collectSyntaxHighlightForToken(sourceCode, token, highlights);
        }

        if (options.includeSymbolHighlights) {
          collectBraceAndTagHighlights(
            token,
            openCurlyBracesStack,
            openHtmlTagsStack,
            bracesAndTagsHighlights,
          );
        }

        if (options.includeNcloc && token.loc && shouldCountForNcloc(token, nclocState)) {
          addLines(token.loc.start.line, token.loc.end.line, ncloc);
        }

        if (options.includeCpdTokens && index < jsTokensCount) {
          collectCpdToken(
            token as unknown as EslintAST.Token,
            jsxTokens,
            importTokens,
            requireTokens,
            cpdTokens,
          );
        }
      }
    }

    if (needsCommentLoop) {
      const astCommentsCount = sourceCode.ast.comments.length;
      const ignoredHeaderComments =
        (options.includeCommentLines || options.includeNoSonar) && options.ignoreHeaderComments
          ? countHeaderComments(sourceCode)
          : 0;

      for (let index = 0; index < comments.length; index++) {
        const comment = comments[index];

        if (options.includeHighlights) {
          collectSyntaxHighlightForComment(comment, highlights);
        }

        if (
          (options.includeCommentLines || options.includeNoSonar) &&
          index >= ignoredHeaderComments &&
          index < astCommentsCount
        ) {
          collectCommentMetricsForComment(
            comment,
            options.includeCommentLines,
            commentLines,
            nosonarLines,
          );
        }
      }
    }
  }

  const highlightedSymbols = options.includeSymbolHighlights
    ? [...computeVariableHighlights(sourceCode, variables), ...bracesAndTagsHighlights]
    : [];

  return {
    commentLines: sortNumeric(commentLines),
    nosonarLines: sortNumeric(nosonarLines),
    ncloc: sortNumeric(ncloc),
    executableLines: sortNumeric(executableLines),
    functions,
    statements,
    classes,
    complexity,
    highlights,
    highlightedSymbols,
    cpdTokens,
  };
}

function collectSyntaxHighlightForToken(
  sourceCode: SourceCode,
  token: VueAST.Token,
  highlights: SyntaxHighlight[],
) {
  switch (token.type as any) {
    case 'HTMLTagOpen':
    case 'HTMLTagClose':
    case 'HTMLEndTagOpen':
    case 'HTMLSelfClosingTagClose':
    case 'Keyword':
      highlight(token, 'KEYWORD', highlights);
      break;
    case 'HTMLLiteral':
    case 'String':
    case 'Template':
    case 'RegularExpression':
      highlight(token, 'STRING', highlights);
      break;
    case 'Numeric':
      highlight(token, 'CONSTANT', highlights);
      break;
    case 'Identifier': {
      const node = sourceCode.getNodeByRangeIndex(token.range[0]);
      // @ts-ignore
      if (token.value === 'type' && node?.type === 'TSTypeAliasDeclaration') {
        highlight(token, 'KEYWORD', highlights);
      }
      // @ts-ignore
      if (token.value === 'as' && node?.type === 'TSAsExpression') {
        highlight(token, 'KEYWORD', highlights);
      }
      break;
    }
  }
}

function collectSyntaxHighlightForComment(comment: VueAST.Token, highlights: SyntaxHighlight[]) {
  if (
    (comment.type === 'Block' && comment.value.startsWith('*')) ||
    comment.type === 'HTMLBogusComment'
  ) {
    highlight(comment, 'STRUCTURED_COMMENT', highlights);
  } else {
    highlight(comment, 'COMMENT', highlights);
  }
}

function collectBraceAndTagHighlights(
  token: VueAST.Token,
  openCurlyBracesStack: VueAST.Token[],
  openHtmlTagsStack: VueAST.Token[],
  highlightedSymbols: SymbolHighlight[],
) {
  switch (token.type) {
    case 'Punctuator':
      if (token.value === '{') {
        openCurlyBracesStack.push(token);
      } else if (token.value === '}') {
        const openBrace = openCurlyBracesStack.pop();
        if (openBrace) {
          highlightedSymbols.push({
            declaration: convertLocation(openBrace.loc),
            references: [convertLocation(token.loc)],
          });
        }
      }
      break;
    case 'HTMLTagOpen':
      openHtmlTagsStack.push(token);
      break;
    case 'HTMLSelfClosingTagClose':
      openHtmlTagsStack.pop();
      break;
    case 'HTMLEndTagOpen': {
      const openHtmlTag = openHtmlTagsStack.pop();
      if (openHtmlTag) {
        highlightedSymbols.push({
          declaration: convertLocation(openHtmlTag.loc),
          references: [convertLocation(token.loc)],
        });
      }
      break;
    }
  }
}

function shouldCountForNcloc(token: VueAST.Token, state: NclocState): boolean {
  if (token.type === 'HTMLTagOpen' && token.value === 'style') {
    state.withinStyle = true;
  } else if (token.type === 'HTMLEndTagOpen' && token.value === 'style') {
    state.withinStyle = false;
    state.withinComment = false;
  }

  if (token.type === 'HTMLWhitespace') {
    return false;
  }

  if (token.type === 'HTMLRawText' && !state.withinStyle) {
    return false;
  }

  if (state.withinStyle && !state.withinComment && token.value === '/*') {
    state.withinComment = true;
    return false;
  }

  if (state.withinStyle && state.withinComment) {
    state.withinComment = token.value !== '*/';
    return false;
  }

  return true;
}

function collectCommentMetricsForComment(
  comment: VueAST.Token,
  includeCommentLines: boolean,
  commentLines: Set<number>,
  nosonarLines: Set<number>,
) {
  if (!comment.loc) {
    return;
  }

  const commentValue = comment.value.startsWith('*')
    ? comment.value.substring(1).trim()
    : comment.value.trim();

  if (commentValue.toUpperCase().startsWith(NOSONAR)) {
    addLines(comment.loc.start.line, comment.loc.end.line, nosonarLines);
  } else if (includeCommentLines && commentValue.length > 0) {
    addLines(comment.loc.start.line, comment.loc.end.line, commentLines);
  }
}

function countHeaderComments(sourceCode: SourceCode) {
  const firstToken = sourceCode.getFirstToken(sourceCode.ast);
  return firstToken ? sourceCode.getCommentsBefore(firstToken).length : 0;
}

function collectCpdToken(
  token: EslintAST.Token,
  jsxTokens: Set<EslintAST.Token>,
  importTokens: Set<EslintAST.Token>,
  requireTokens: Set<EslintAST.Token>,
  cpdTokens: CpdToken[],
) {
  if (!token.loc) {
    return;
  }

  let text = token.value;

  if (text.trim().length === 0) {
    return;
  }
  if (importTokens.has(token) || requireTokens.has(token)) {
    return;
  }
  if (isStringLiteralToken(token) && !jsxTokens.has(token)) {
    text = 'LITERAL';
  }

  cpdTokens.push({
    location: convertLocation(token.loc),
    image: text,
  });
}

function computeVariableHighlights(
  sourceCode: SourceCode,
  variables: Set<Scope.Variable>,
): SymbolHighlight[] {
  const highlightedSymbols: SymbolHighlight[] = [];
  for (const variable of variables) {
    // If a variable is initialized during declaration it can be part of references as well.
    // We merge declarations and references to remove duplicates and keep the earliest as declaration.
    const allRef = [
      ...new Set([
        ...variable.defs.map(d => d.name),
        ...variable.references.map(r => r.identifier),
      ]),
    ]
      .filter(identifier => !!identifier.loc)
      .sort((left, right) => left.loc!.start.line - right.loc!.start.line);
    if (allRef.length === 0) {
      continue;
    }
    highlightedSymbols.push({
      declaration: identifierLocation(allRef[0] as TSESTree.Node, sourceCode),
      references: allRef
        .slice(1)
        .map(reference => identifierLocation(reference as TSESTree.Node, sourceCode)),
    });
  }
  return highlightedSymbols;
}

/**
 * Remove TypeAnnotation part from location of identifier for purpose of symbol highlighting.
 * This avoids declaration/reference overlap on some parser edge cases.
 */
function identifierLocation(node: TSESTree.Node, sourceCode: SourceCode) {
  const loc = {
    start: node.loc.start,
    end:
      node.type === 'Identifier' && node.typeAnnotation
        ? sourceCode.getLocFromIndex(node.typeAnnotation.range[0])
        : node.loc.end,
  };
  return convertLocation(loc);
}

function collectCpdExclusions(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  jsxTokens: Set<EslintAST.Token>,
  importTokens: Set<EslintAST.Token>,
  requireTokens: Set<EslintAST.Token>,
) {
  switch (node.type) {
    case 'JSXAttribute':
      if (node.value?.type === 'Literal') {
        for (const token of sourceCode.getTokens(node.value as unknown as estree.Node)) {
          jsxTokens.add(token);
        }
      }
      break;
    case 'ImportDeclaration':
      for (const token of sourceCode.getTokens(node as unknown as estree.Node)) {
        importTokens.add(token);
      }
      break;
    case 'VariableDeclaration': {
      if (node.declarations.length !== 1) {
        break;
      }
      const declaration = node.declarations[0];
      if (
        isRequireCall(declaration.init) ||
        (declaration.init?.type === 'CallExpression' && isRequireCall(declaration.init.callee)) ||
        (declaration.init?.type === 'MemberExpression' && isRequireCall(declaration.init.object)) ||
        (declaration.init?.type === 'CallExpression' &&
          declaration.init.callee.type === 'MemberExpression' &&
          isRequireCall(declaration.init.callee.object))
      ) {
        for (const token of sourceCode.getTokens(node as unknown as estree.Node)) {
          requireTokens.add(token);
        }
      }
      break;
    }
  }
}

function highlight(
  node: VueAST.Token | estree.Comment,
  highlightKind: TextType,
  highlights: SyntaxHighlight[],
) {
  if (!node.loc) {
    return;
  }

  highlights.push({
    location: convertLocation(node.loc),
    textType: highlightKind,
  });
}

function isStringLiteralToken(token: EslintAST.Token) {
  return token.value.startsWith('"') || token.value.startsWith("'") || token.value.startsWith('`');
}

function isRequireCall(node: TSESTree.Node | null): boolean {
  return (
    node?.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require'
  );
}

function sortNumeric(set: Set<number>) {
  return Array.from(set).sort((left, right) => left - right);
}
