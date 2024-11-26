/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { SourceCode } from 'eslint';
import { findCommentLines } from './comments.js';

/**
 * Finds the line numbers of `NOSONAR` comments
 *
 * `NOSONAR` comments are indicators for SonarQube to ignore
 * any issues raised on the same lines as those where appear
 * such comments.
 *
 * @param sourceCode the source code to visit
 * @returns the line numbers of `NOSONAR` comments
 */
export function findNoSonarLines(sourceCode: SourceCode) {
  return {
    nosonarLines: findCommentLines(sourceCode, false).nosonarLines,
  };
}
