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
import { visitAndCountIf } from './helpers/index.js';

/**
 * The ESLint function node types
 */
const FUNCTION_NODES = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];

/**
 * Computes the number of functions in the source code
 */
export function countFunctions(sourceCode: SourceCode): number {
  return visitAndCountIf(sourceCode, node => FUNCTION_NODES.includes(node.type));
}
