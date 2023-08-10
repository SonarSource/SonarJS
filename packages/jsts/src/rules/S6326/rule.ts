/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6326/javascript

import { Rule } from 'eslint';
import * as regexpp from 'regexpp';
import { createRegExpRule } from '../helpers/regex';

export const rule: Rule.RuleModule = createRegExpRule(context => {
  let rawPattern: string;

  return {
    onRegExpLiteralEnter: (node: regexpp.AST.RegExpLiteral) => {
      rawPattern = node.raw;
    },
    onCharacterEnter: (node: regexpp.AST.Character) => {
      if (node.raw !== ' ' || node.parent.type === 'CharacterClass') {
        return;
      }

      const nextChar = rawPattern[node.start + 1];
      if (nextChar !== ' ') {
        const spacesBefore = countSpacesBefore(rawPattern, node.start);
        if (spacesBefore > 0) {
          const spacesNumber = spacesBefore + 1;
          context.reportRegExpNode({
            message: `If multiple spaces are required here, use number quantifier ({${spacesNumber}}).`,
            regexpNode: node,
            offset: [-spacesNumber + 1, 0],
            node: context.node,
          });
        }
      }
    },
  };
});

function countSpacesBefore(pattern: string, index: number) {
  let counter = 0;
  for (let i = index - 1; i > 0; i--) {
    if (pattern[i] === ' ') {
      counter++;
    } else {
      break;
    }
  }

  return counter;
}
