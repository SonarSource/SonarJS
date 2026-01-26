/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type { AST } from '@eslint-community/regexpp';
import { generateMeta, IssueLocation, toSecondaryLocation } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import { getRegexpLocation } from '../helpers/regex/location.js';

export const rule: Rule.RuleModule = createRegExpRule(context => {
  const unicodeProperties: { character: AST.Character; offset: number }[] = [];
  const unicodeCharacters: AST.Quantifier[] = [];
  let rawPattern: string;
  let isUnicodeEnabled = false;
  return {
    onRegExpLiteralEnter: (node: AST.RegExpLiteral) => {
      rawPattern = node.raw;
      isUnicodeEnabled = node.flags.unicode;
    },
    onQuantifierEnter: (quantifier: AST.Quantifier) => {
      if (isUnicodeEnabled) {
        return;
      }
      /* \u{hhhh}, \u{hhhhh} */
      const { raw, min: hex } = quantifier;
      if (
        raw.startsWith(String.raw`\u`) &&
        !raw.includes(',') &&
        ['hhhh'.length, 'hhhhh'.length].includes(hex.toString().length)
      ) {
        unicodeCharacters.push(quantifier);
      }
    },
    onCharacterEnter: (character: AST.Character) => {
      if (isUnicodeEnabled) {
        return;
      }
      const c = character.raw;
      if (c !== String.raw`\p` && c !== String.raw`\P`) {
        return;
      }

      const result = parseUnicodeProperty(rawPattern, character.start + c.length);
      if (result.isValid) {
        unicodeProperties.push({ character, offset: result.offset! - c.length });
      }
    },
    onRegExpLiteralLeave: (regexp: AST.RegExpLiteral) => {
      if (!isUnicodeEnabled && (unicodeProperties.length > 0 || unicodeCharacters.length > 0)) {
        const secondaryLocations: IssueLocation[] = [];
        for (const p of unicodeProperties) {
          const loc = getRegexpLocation(context.node, p.character, context, [0, p.offset]);
          if (loc) {
            secondaryLocations.push(toSecondaryLocation({ loc }, 'Unicode property'));
          }
        }
        for (const c of unicodeCharacters) {
          const loc = getRegexpLocation(context.node, c, context);
          if (loc) {
            secondaryLocations.push(toSecondaryLocation({ loc }, 'Unicode character'));
          }
        }
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
}, generateMeta(meta));

type UnicodePropertyState =
  | 'start'
  | 'openingBracket'
  | 'alpha'
  | 'equal'
  | 'alpha1'
  | 'closingBracket'
  | 'end';

function parseUnicodeProperty(
  rawPattern: string,
  startOffset: number,
): { isValid: boolean; offset?: number } {
  let state: UnicodePropertyState = 'start';
  let offset = startOffset;
  let nextChar: string;

  do {
    nextChar = rawPattern[offset];
    offset++;
    state = transitionState(state, nextChar);
    if (state === 'closingBracket') {
      return { isValid: true, offset };
    }
  } while (state !== 'end');

  return { isValid: false };
}

function transitionState(state: UnicodePropertyState, nextChar: string): UnicodePropertyState {
  switch (state) {
    case 'start':
      return nextChar === '{' ? 'openingBracket' : 'end';
    case 'openingBracket':
      return /[a-zA-Z]/.test(nextChar) ? 'alpha' : 'end';
    case 'alpha':
      return transitionFromAlpha(nextChar);
    case 'equal':
      return /[a-zA-Z]/.test(nextChar) ? 'alpha1' : 'end';
    case 'alpha1':
      return transitionFromAlpha1(nextChar);
    case 'closingBracket':
      return 'end';
    default:
      return 'end';
  }
}

function transitionFromAlpha(nextChar: string): UnicodePropertyState {
  if (/[a-zA-Z]/.test(nextChar)) {
    return 'alpha';
  }
  if (nextChar === '=') {
    return 'equal';
  }
  if (nextChar === '}') {
    return 'closingBracket';
  }
  return 'end';
}

function transitionFromAlpha1(nextChar: string): UnicodePropertyState {
  if (/[a-zA-Z]/.test(nextChar)) {
    return 'alpha1';
  }
  if (nextChar === '}') {
    return 'closingBracket';
  }
  return 'end';
}
