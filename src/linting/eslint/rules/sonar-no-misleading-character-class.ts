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
// https://sonarsource.github.io/rspec/#/rspec/S5868/javascript

import { Rule } from 'eslint';
import { Character, CharacterClassElement } from 'regexpp/ast';
import { createRegExpRule } from './helpers/regex';

export const rule: Rule.RuleModule = createRegExpRule(context => {
  function characters(nodes: CharacterClassElement[]): Character[][] {
    let current: Character[] = [];
    const sequences: Character[][] = [current];
    for (const node of nodes) {
      if (node.type === 'Character') {
        current.push(node);
      } else if (node.type === 'CharacterClassRange') {
        // for following regexp [xa-z] we produce [[xa],[z]]
        // we would report for example if instead of 'xa' there would be unicode combined class
        current.push(node.min);
        current = [node.max];
        sequences.push(current);
      } else if (node.type === 'CharacterSet' && current.length > 0) {
        // CharacterSet is for example [\d], ., or \p{ASCII}
        // see https://github.com/mysticatea/regexpp/blob/master/src/ast.ts#L222
        current = [];
        sequences.push(current);
      }
    }
    return sequences;
  }

  return {
    onCharacterClassEnter(ccNode) {
      for (const chars of characters(ccNode.elements)) {
        const idx = chars.findIndex(
          (c, i) =>
            i !== 0 && isCombiningCharacter(c.value) && !isCombiningCharacter(chars[i - 1].value),
        );
        if (idx >= 0) {
          const combinedChar = chars[idx - 1].raw + chars[idx].raw;
          const message = `Move this Unicode combined character '${combinedChar}' outside of [...]`;
          context.reportRegExpNode({ regexpNode: chars[idx], node: context.node, message });
        }
      }
    },
  };
});

function isCombiningCharacter(codePoint: number) {
  return /^[\p{Mc}\p{Me}\p{Mn}]$/u.test(String.fromCodePoint(codePoint));
}
