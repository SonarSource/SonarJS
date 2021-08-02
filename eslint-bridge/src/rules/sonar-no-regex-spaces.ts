/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6326

import { Rule } from 'eslint';
import { createRegExpRule } from './regex-rule-template';
import * as regexpp from 'regexpp';

export const rule: Rule.RuleModule = createRegExpRule(context => {
  let spacesNumber = 0;
  let lastSpaceCharacter: regexpp.AST.Character | null = null;
  let spacesParent: regexpp.AST.Node | null = null;

  const checkSpaces = () => {
    if (spacesNumber > 1) {
      context.reportRegExpNode({
        message: `If multiple spaces are required here, use number quantifier ({${spacesNumber}}).`,
        regexpNode: lastSpaceCharacter!,
        offset: [-spacesNumber + 1, 0],
        node: context.node,
      });
    }
    spacesNumber = 0;
    spacesParent = null;
  };

  return {
    onCharacterEnter: (node: regexpp.AST.Character) => {
      if (node.value === ' '.codePointAt(0)) {
        lastSpaceCharacter = node;
        let { parent } = node;
        if (parent.type === 'CharacterClass') {
          // '/[  ]/' will be reported by S5869
          return;
        }

        parent = parent.type === 'Quantifier' ? parent.parent : parent;

        if (spacesNumber > 0 && spacesParent === parent) {
          spacesNumber++;
        } else if (spacesNumber === 0) {
          spacesNumber++;
          spacesParent = parent;
        }
      } else {
        checkSpaces();
      }
    },
    onPatternLeave: checkSpaces,
  };
});
