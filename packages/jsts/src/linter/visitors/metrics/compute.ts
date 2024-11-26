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
import { countClasses } from './classes.js';
import { findCommentLines } from './comments.js';
import { computeCyclomaticComplexity } from './cyclomatic-complexity.js';
import { findExecutableLines } from './executable-lines.js';
import { countFunctions } from './functions.js';
import { Metrics } from './metrics.js';
import { findNcloc } from './ncloc.js';
import { countStatements } from './statements.js';

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
