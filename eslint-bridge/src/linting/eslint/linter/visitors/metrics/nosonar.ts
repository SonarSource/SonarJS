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
import { findCommentLines } from './comments';

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
