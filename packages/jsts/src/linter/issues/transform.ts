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
import type { JsTsLanguage } from '../../../../shared/src/helpers/configuration.js';
import type { SonarMeta } from '../../rules/helpers/generate-meta.js';
import type { NormalizedAbsolutePath } from '../../rules/helpers/files.js';

/**
 * Transforms ESLint messages into SonarQube issues
 *
 * The result of linting a source code requires post-linting transformations
 * to return SonarQube issues. These transformations include
 * decoding issues with secondary locations as well as converting
 * quick fixes.
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
 * @returns the transformed issues
 */
export function transformMessages(
  messages: Linter.LintMessage[],
  language: JsTsLanguage,
  ctx: {
    sourceCode: SourceCode;
    ruleMetas: { [key: string]: SonarMeta };
    filePath: NormalizedAbsolutePath;
  },
): JsTsIssue[] {
  const issues: JsTsIssue[] = [];

  for (const message of messages) {
    let issue = convertMessage(ctx.sourceCode, message, ctx.filePath, language);
    if (issue !== null) {
      issue = normalizeLocation(decodeSecondaryLocations(ctx.ruleMetas[issue.ruleId], issue));
      issues.push(issue);
    }
  }

  return issues;
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
