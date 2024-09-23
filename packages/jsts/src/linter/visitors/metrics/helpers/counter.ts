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
import * as estree from 'estree';
import { SourceCode } from 'eslint';
import { visit } from '../..//index.js';

/**
 * Counts the number of nodes matching a predicate
 * @param sourceCode the source code to vist
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
