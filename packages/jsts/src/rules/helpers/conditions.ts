/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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

import { TSESTree } from '@typescript-eslint/utils';
import { isIfStatement } from './ast';

/** Returns a list of statements corresponding to a `if - else if - else` chain */
export function collectIfBranches(node: TSESTree.IfStatement) {
  const branches: TSESTree.Statement[] = [node.consequent];
  let endsWithElse = false;
  let statement = node.alternate;

  while (statement) {
    if (isIfStatement(statement)) {
      branches.push(statement.consequent);
      statement = statement.alternate;
    } else {
      branches.push(statement);
      endsWithElse = true;
      break;
    }
  }

  return { branches, endsWithElse };
}

/** Returns a list of `switch` clauses (both `case` and `default`) */
export function collectSwitchBranches(node: TSESTree.SwitchStatement) {
  let endsWithDefault = false;
  const branches = node.cases
    .filter((clause, index) => {
      if (!clause.test) {
        endsWithDefault = true;
      }
      // if a branch has no implementation, it's fall-through and it should not be considered
      // the only exception is the last case
      const isLast = index === node.cases.length - 1;
      return isLast || clause.consequent.length > 0;
    })
    .map(clause => takeWithoutBreak(clause.consequent));
  return { branches, endsWithDefault };
}

/** Excludes the break statement from the list */
export function takeWithoutBreak(nodes: TSESTree.Statement[]) {
  return nodes.length > 0 && nodes[nodes.length - 1].type === 'BreakStatement'
    ? nodes.slice(0, -1)
    : nodes;
}
