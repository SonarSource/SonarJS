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
// https://sonarsource.github.io/rspec/#/rspec/S6324/javascript

import { Rule } from 'eslint';
import { Character } from '@eslint-community/regexpp/ast';
import { createRegExpRule } from '../helpers/regex/index.ts';
import { generateMeta } from '../helpers/index.ts';
import { meta } from './meta.ts';

const EXCEPTIONS = ['\t', '\n'];

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onCharacterEnter: (character: Character) => {
        const { value, raw } = character;
        if (
          value >= 0x00 &&
          value <= 0x1f &&
          (isSameInterpreted(raw, value) || raw.startsWith('\\x') || raw.startsWith('\\u')) &&
          !EXCEPTIONS.includes(raw)
        ) {
          context.reportRegExpNode({
            message: 'Remove this control character.',
            node: context.node,
            regexpNode: character,
          });
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);

/**
 * When the character has been interpreted, we need to compare its
 * code point value.
 */
function isSameInterpreted(raw: string, value: number) {
  return raw.codePointAt(0) === value;
}
