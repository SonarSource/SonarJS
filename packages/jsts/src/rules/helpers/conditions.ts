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
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import estree from 'estree';

/** Returns a list of statements corresponding to a `if - else if - else` chain */
export function collectIfBranches(node: estree.IfStatement) {
  const branches: estree.Statement[] = [node.consequent];
  let endsWithElse = false;
  let statement = node.alternate;

  while (statement) {
    if (statement.type === AST_NODE_TYPES.IfStatement) {
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
export function collectSwitchBranches(node: estree.SwitchStatement) {
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
export function takeWithoutBreak(nodes: estree.Statement[]) {
  return nodes.length > 0 && nodes[nodes.length - 1].type === AST_NODE_TYPES.BreakStatement
    ? nodes.slice(0, -1)
    : nodes;
}
