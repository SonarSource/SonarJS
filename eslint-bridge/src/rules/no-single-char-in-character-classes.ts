/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6397/javascript

import { Rule } from 'eslint';
import { CharacterClass, CharacterClassElement } from 'regexpp/ast';
import { createRegExpRule } from './regex-rule-template';

const FORBIDDEN_TYPES = ['EscapeCharacterSet', 'UnicodePropertyCharacterSet', 'Character'];
const FALSE_POSITIVES = '[{(.?+*$^\\\\';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onCharacterClassEnter: (node: CharacterClass) => {
        if (onlyOneIsValid(node.elements) && !node.negate) {
          //const [startCol, endCol] = fixLoc(node);
          context.reportRegExpNode({
            //messageId: 'issue',
            message: 'Replace this character class by the character itself.',
            //loc: {
            //    start: { column: startCol },
            //    end: { column: endCol },
            //},
            node: context.node,
            regexpNode: node,
          });
        }
      },
    };
  },
  {
    meta: {
      messages: {
        issue: 'Replace this character class by the character itself.',
      },
    },
  },
);

/**
 * Check if there are multiple
 * 1. single one: OK
 * 2. multiple ones: only if one is valid
 */
function onlyOneIsValid(elems: CharacterClassElement[]) {
  let validOnes = 0;
  elems.forEach(elem => {
    if (FORBIDDEN_TYPES.includes(elem.type) && !FALSE_POSITIVES.includes(elem.raw)) {
      validOnes++;
    }
  });
  return validOnes === 1;
}

/* function fixLoc(node: CharacterClass) {
    if (node.end - node.start > 3) {
        return [node.start+1, node.end];
    } else {
        return [node.start, node.end];
    }
} */
