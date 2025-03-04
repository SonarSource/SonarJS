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
// https://sonarsource.github.io/rspec/#/rspec/S6326/javascript

import { AST, Rule } from 'eslint';
import * as regexpp from '@eslint-community/regexpp';
import { generateMeta } from '../helpers/index.js';
import * as meta from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import { getRegexpRange } from '../helpers/regex/range.js';

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
  generateMeta(meta, { hasSuggestions: true }),
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
