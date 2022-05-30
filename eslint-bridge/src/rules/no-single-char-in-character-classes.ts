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

// based on S5869

import { Rule } from 'eslint';
import { CharacterClass } from 'regexpp/ast';
import { createRegExpRule } from './regex-rule-template';


export const rule: Rule.RuleModule = createRegExpRule(context => {
    return {
        onCharacterClassEnter: (node: CharacterClass) => {
          if (node.raw.length <= 3) {
            context.reportRegExpNode({
              //messageId: 'issue',
              message: 'Replace this character class by the character itself.',
              node: context.node,
              regexpNode: node,
            });
          }
        },
      };

  
}, {
    meta: {
        messages: {
            issue: 'Replace this character class by the character itself.'
        }
    }
});
