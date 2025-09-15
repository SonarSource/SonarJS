/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
 * The ESLint statement node types
 */
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

/**
 * Computes the number of statements in the source code
 */
export function countStatements(sourceCode: SourceCode): number {
  return visitAndCountIf(sourceCode, node => STATEMENT_NODES.has(node.type));
}
