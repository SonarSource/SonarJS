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
// https://sonarsource.github.io/rspec/#/rspec/S5867/javascript

import type { Rule } from 'eslint';
import { Character, Quantifier, RegExpLiteral } from '@eslint-community/regexpp/ast';
import { generateMeta, IssueLocation, toSecondaryLocation } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import { getRegexpLocation } from '../helpers/regex/location.js';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    const unicodeProperties: { character: Character; offset: number }[] = [];
    const unicodeCharacters: Quantifier[] = [];
    let rawPattern: string;
    let isUnicodeEnabled = false;
    return {
      onRegExpLiteralEnter: (node: RegExpLiteral) => {
        rawPattern = node.raw;
        isUnicodeEnabled = node.flags.unicode;
      },
      onQuantifierEnter: (quantifier: Quantifier) => {
        if (isUnicodeEnabled) {
          return;
        }
        /* \u{hhhh}, \u{hhhhh} */
        const { raw, min: hex } = quantifier;
        if (
          raw.startsWith('\\u') &&
          !raw.includes(',') &&
          ['hhhh'.length, 'hhhhh'.length].includes(hex.toString().length)
        ) {
          unicodeCharacters.push(quantifier);
        }
      },
      onCharacterEnter: (character: Character) => {
        if (isUnicodeEnabled) {
          return;
        }
        const c = character.raw;
        if (c !== '\\p' && c !== '\\P') {
          return;
        }
        let state:
          | 'start'
          | 'openingBracket'
          | 'alpha'
          | 'equal'
          | 'alpha1'
          | 'closingBracket'
          | 'end' = 'start';
        let offset = character.start + c.length;
        let nextChar: string;
        do {
          nextChar = rawPattern[offset];
          offset++;
          switch (state) {
            case 'start':
              if (nextChar === '{') {
                state = 'openingBracket';
              } else {
                state = 'end';
              }
              break;
            case 'openingBracket':
              if (/[a-zA-Z]/.test(nextChar)) {
                state = 'alpha';
              } else {
                state = 'end';
              }
              break;
            case 'alpha':
              if (/[a-zA-Z]/.test(nextChar)) {
                state = 'alpha';
              } else if (nextChar === '=') {
                state = 'equal';
              } else if (nextChar === '}') {
                state = 'closingBracket';
              } else {
                state = 'end';
              }
              break;
            case 'equal':
              if (/[a-zA-Z]/.test(nextChar)) {
                state = 'alpha1';
              } else {
                state = 'end';
              }
              break;
            case 'alpha1':
              if (/[a-zA-Z]/.test(nextChar)) {
                state = 'alpha1';
              } else if (nextChar === '}') {
                state = 'closingBracket';
              } else {
                state = 'end';
              }
              break;
            case 'closingBracket':
              state = 'end';
              unicodeProperties.push({ character, offset: offset - c.length - 1 });
              break;
          }
        } while (state !== 'end');
      },
      onRegExpLiteralLeave: (regexp: RegExpLiteral) => {
        if (!isUnicodeEnabled && (unicodeProperties.length > 0 || unicodeCharacters.length > 0)) {
          const secondaryLocations: IssueLocation[] = [];
          unicodeProperties.forEach(p => {
            const loc = getRegexpLocation(context.node, p.character, context, [0, p.offset]);
            if (loc) {
              secondaryLocations.push(toSecondaryLocation({ loc }, 'Unicode property'));
            }
          });
          unicodeCharacters.forEach(c => {
            const loc = getRegexpLocation(context.node, c, context);
            if (loc) {
              secondaryLocations.push(toSecondaryLocation({ loc }, 'Unicode character'));
            }
          });
          context.reportRegExpNode(
            {
              message: `Enable the 'u' flag for this regex using Unicode constructs.`,
              node: context.node,
              regexpNode: regexp,
            },
            secondaryLocations,
          );
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);
