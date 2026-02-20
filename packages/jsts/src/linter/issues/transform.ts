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
import type { Linter, SourceCode } from 'eslint';
import { decodeSecondaryLocations } from './decode.js';
import type { JsTsIssue } from './issue.js';
import { convertMessage } from './message.js';
import { extractCognitiveComplexity, extractHighlightedSymbols } from './extract.js';
import type { SymbolHighlight } from '../visitors/symbol-highlighting.js';
import type { JsTsLanguage } from '../../../../shared/src/helpers/configuration.js';
import { type SonarMeta, type NormalizedAbsolutePath } from '../../rules/helpers/index.js';

/**
 * The result of linting a source code
 *
 * ESLint API returns what it calls messages as results of linting a file.
 * A linting result in the context of the analyzer includes more than that
 * as it needs not only to transform ESLint messages into SonarQube issues
 * as well as analysis data about the analyzed source code, namely symbol
 * highlighting and cognitive complexity.
 *
 * @param issues the issues found in the code
 * @param highlightedSymbols the symbol highlighting of the code
 * @param cognitiveComplexity the cognitive complexity of the code
 */
export type LintingResult = {
  issues: JsTsIssue[];
  highlightedSymbols: SymbolHighlight[];
  cognitiveComplexity?: number;
};

/**
 * Transforms ESLint messages into SonarQube issues
 *
 * The result of linting a source code requires post-linting transformations
 * to return SonarQube issues. These transformations include
 * decoding issues with secondary locations as well as converting
 * quick fixes.
 *
 * Besides issues, a few metrics are computed during linting in the form of
 * an internal custom rule execution, namely cognitive complexity and symbol
 * highlighting. These custom rules also produce issues that are extracted.
 *
 * Transforming an ESLint message into a SonarQube issue implies:
 * - converting ESLint messages into SonarQube issues
 * - converting ESLint fixes into SonarLint quick fixes
 * - decoding encoded secondary locations
 * - normalizing issue locations
 *
 * @param messages ESLint messages to transform
 * @param language the file language
 * @param ctx contextual information
 * @returns the linting result
 */
export function transformMessages(
  messages: Linter.LintMessage[],
  language: JsTsLanguage,
  ctx: {
    sourceCode: SourceCode;
    ruleMetas: { [key: string]: SonarMeta };
    filePath: NormalizedAbsolutePath;
  },
): LintingResult {
  const issues: JsTsIssue[] = [];

  for (const message of messages) {
    let issue = convertMessage(ctx.sourceCode, message, ctx.filePath, language);
    if (issue !== null) {
      issue = normalizeLocation(decodeSecondaryLocations(ctx.ruleMetas[issue.ruleId], issue));
      issues.push(issue);
    }
  }

  const highlightedSymbols = extractHighlightedSymbols(issues);
  const cognitiveComplexity = extractCognitiveComplexity(issues);
  return {
    issues,
    highlightedSymbols,
    cognitiveComplexity,
  };
}

/**
 * Normalizes an issue location
 *
 * SonarQube uses 0-based column indexing when it comes to issue locations
 * while ESLint uses 1-based column indexing for message locations.
 *
 * @param issue the issue to normalize
 * @returns the normalized issue
 */
function normalizeLocation(issue: JsTsIssue): JsTsIssue {
  if (issue.column) {
    issue.column -= 1;
  }
  if (issue.endColumn) {
    issue.endColumn -= 1;
  }
  return issue;
}
