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
// https://sonarsource.github.io/rspec/#/rspec/S5869/javascript

import { Rule } from 'eslint';
import { CharacterClass, Flags, Node, RegExpLiteral } from 'regexpp/ast';
import { toEncodedMessage } from './helpers';
import {
  createRegExpRule,
  getRegexpLocation,
  SimplifiedRegexCharacterClass,
} from './helpers/regex';
import { SONAR_RUNTIME } from '../linter/parameters';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    let flags: Flags;
    return {
      onRegExpLiteralEnter: (node: RegExpLiteral) => {
        flags = node.flags;
      },
      onCharacterClassEnter: (node: CharacterClass) => {
        const duplicates = new Set<Node>();
        const characterClass = new SimplifiedRegexCharacterClass(flags);
        node.elements.forEach(element => {
          const intersections = new SimplifiedRegexCharacterClass(flags, element).findIntersections(
            characterClass,
          );
          if (intersections.length > 0) {
            intersections.forEach(intersection => duplicates.add(intersection));
            duplicates.add(element);
          }
          characterClass.add(element);
        });
        if (duplicates.size > 0) {
          const [primary, ...secondaries] = duplicates;
          context.reportRegExpNode({
            message: toEncodedMessage(
              'Remove duplicates in this character class.',
              secondaries.map(snd => ({ loc: getRegexpLocation(context.node, snd, context) })),
              secondaries.map(_ => 'Additional duplicate'),
            ),
            node: context.node,
            regexpNode: primary,
          });
        }
      },
    };
  },
  {
    meta: {
      schema: [
        {
          // internal parameter for rules having secondary locations
          enum: [SONAR_RUNTIME],
        },
      ],
    },
  },
);
