/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5869/javascript

import { AST, Rule } from 'eslint';
import { CharacterClass, Flags, Node, RegExpLiteral } from '@eslint-community/regexpp/ast';
import { generateMeta, IssueLocation, toSecondaryLocation } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import { SimplifiedRegexCharacterClass } from '../helpers/regex/simplified-regex-character-class.js';
import { getRegexpLocation } from '../helpers/regex/location.js';

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
          const secondaryLocations: IssueLocation[] = [];
          for (const secondary of secondaries) {
            const loc: AST.SourceLocation | null = getRegexpLocation(
              context.node,
              secondary,
              context,
            );
            if (loc) {
              secondaryLocations.push(toSecondaryLocation({ loc }, 'Additional duplicate'));
            }
          }
          context.reportRegExpNode(
            {
              message: 'Remove duplicates in this character class.',
              node: context.node,
              regexpNode: primary,
            },
            secondaryLocations,
          );
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);
