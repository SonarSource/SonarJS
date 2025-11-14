/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type estree from 'estree';
import { SourceCode } from 'eslint';
import { visit } from '../../visitor.js';

/**
 * Counts the number of nodes matching a predicate
 * @param sourceCode the source code to visit
 * @param predicate the condition to count the node
 * @returns the number of nodes matching the predicate
 */
export function visitAndCountIf(
  sourceCode: SourceCode,
  predicate: (node: estree.Node) => boolean,
): number {
  let results = 0;
  visit(sourceCode, node => {
    if (predicate(node)) {
      results++;
    }
  });
  return results;
}
