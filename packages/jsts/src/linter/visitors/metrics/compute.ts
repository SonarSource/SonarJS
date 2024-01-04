/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { countClasses } from './classes';
import { findCommentLines } from './comments';
import { computeCyclomaticComplexity } from './cyclomatic-complexity';
import { findExecutableLines } from './executable-lines';
import { countFunctions } from './functions';
import { Metrics } from './metrics';
import { findNcloc } from './ncloc';
import { countStatements } from './statements';

/**
 * Computes the metrics of an ESLint source code
 * @param sourceCode the ESLint source code
 * @param ignoreHeaderComments a flag to ignore file header comments
 * @param cognitiveComplexity the cognitive complexity of the source code
 * @returns the source code metrics
 */
export function computeMetrics(
  sourceCode: SourceCode,
  ignoreHeaderComments: boolean,
  cognitiveComplexity = 0,
): Metrics {
  return {
    ncloc: findNcloc(sourceCode),
    ...findCommentLines(sourceCode, ignoreHeaderComments),
    executableLines: findExecutableLines(sourceCode),
    functions: countFunctions(sourceCode),
    statements: countStatements(sourceCode),
    classes: countClasses(sourceCode),
    complexity: computeCyclomaticComplexity(sourceCode),
    cognitiveComplexity,
  };
}
