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
 * The ESLint executable node types
 */
const EXECUTABLE_NODES = [
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
];

/**
 * Finds the line numbers of executable lines in the source code
 */
export function findExecutableLines(sourceCode: SourceCode): number[] {
  const lines: Set<number> = new Set();
  visit(sourceCode, node => {
    if (EXECUTABLE_NODES.includes(node.type) && node.loc) {
      lines.add(node.loc.start.line);
    }
  });
  return Array.from(lines).sort((a, b) => a - b);
}
