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
// https://sonarsource.github.io/rspec/#/rspec/S6397/javascript

import { Rule } from 'eslint';
import { CharacterClass, CharacterClassElement } from '@eslint-community/regexpp/ast';
import { createRegExpRule } from '../helpers/regex';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

const FORBIDDEN_TYPES = [
  'EscapeCharacterSet',
  'UnicodePropertyCharacterSet',
  'Character',
  'CharacterSet',
];
const EXCEPTION_META_CHARACTERS = '[{(.?+*$^\\\\';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onCharacterClassEnter: (node: CharacterClass) => {
        if (hasSingleForbiddenCharacter(node.elements) && !node.negate) {
          context.reportRegExpNode({
            messageId: 'issue',
            node: context.node,
            regexpNode: node,
          });
        }
      },
    };
  },

  generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      issue: 'Replace this character class by the character itself.',
    },
  }),
);

function hasSingleForbiddenCharacter(elems: CharacterClassElement[]) {
  return (
    elems.length === 1 &&
    FORBIDDEN_TYPES.includes(elems[0].type) &&
    !EXCEPTION_META_CHARACTERS.includes(elems[0].raw)
  );
}
