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
// https://sonarsource.github.io/rspec/#/rspec/S6326/javascript

import { AST, Rule } from 'eslint';
import * as regexpp from '@eslint-community/regexpp';
import { createRegExpRule, getRegexpRange } from '../helpers/regex';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
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
            const quantifier = `{${spacesNumber}}`;
            const [start, end] = getRegexpRange(context.node, node);
            const range: AST.Range = [start - spacesNumber + 1, end];
            context.reportRegExpNode({
              message: `If multiple spaces are required here, use number quantifier (${quantifier}).`,
              regexpNode: node,
              offset: [-spacesNumber + 1, 0],
              node: context.node,
              suggest: [
                {
                  desc: `Use quantifier ${quantifier}`,
                  fix: fixer => fixer.replaceTextRange(range, ` ${quantifier}`),
                },
              ],
            });
          }
        }
      },
    };
  },
  generateMeta(rspecMeta as Rule.RuleMetaData, { hasSuggestions: true }),
);

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
