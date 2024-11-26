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
import { visit } from '../visitor.js';

/**
 * The ESLint loop node types
 */
const LOOP_NODES = [
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
];

/**
 * The ESLint conditional node types
 */
const CONDITIONAL_NODES = ['IfStatement', 'ConditionalExpression', 'SwitchCase'];

/**
 * The ESLint function node types
 */
const FUNCTION_NODES = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];

/**
 * The ESLint node types increasing complexity
 */
const COMPLEXITY_NODES = [
  ...CONDITIONAL_NODES,
  ...FUNCTION_NODES,
  ...LOOP_NODES,
  'LogicalExpression',
];

/**
 * Computes the cyclomatic complexity of an ESLint source code
 * @param sourceCode the ESLint source code
 * @returns the cyclomatic complexity
 */
export function computeCyclomaticComplexity(sourceCode: SourceCode): number {
  let complexity = 0;
  visit(sourceCode, node => {
    if (COMPLEXITY_NODES.includes(node.type)) {
      complexity++;
    }
  });
  return complexity;
}
