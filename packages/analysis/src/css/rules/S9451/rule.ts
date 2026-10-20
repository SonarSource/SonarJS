/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S9451/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import {
  isTokenBadString,
  isTokenBadURL,
  isTokenComment,
  isTokenString,
  isTokenURL,
  tokenize,
  type CSSToken,
} from '@csstools/css-tokenizer';
import { meta } from './meta.js';
import { gridAreaStrings } from '../helpers/grid-areas.js';

// Stylelint's `no-irregular-whitespace` is not decorated: it reports form feeds, comments inside
// at-rule preludes and unquoted URLs, and shifts locations after strings it ignores.
const ruleName = meta.bindings[0].stylelintKey;

const messages = stylelint.utils.ruleMessages(ruleName, {
  replace: (character: string) => `Replace this ${character} with ordinary whitespace.`,
  remove: (character: string) => `Remove this ${character}.`,
});

// Characters that look like a space, or are invisible, but that CSS does not treat as whitespace
const IRREGULAR_WHITESPACES = new Map([
  ['\u000B', 'U+000B LINE TABULATION'],
  ['\u0085', 'U+0085 NEXT LINE'],
  ['\u00A0', 'U+00A0 NO-BREAK SPACE'],
  ['\u1680', 'U+1680 OGHAM SPACE MARK'],
  ['\u180E', 'U+180E MONGOLIAN VOWEL SEPARATOR'],
  ['\u2000', 'U+2000 EN QUAD'],
  ['\u2001', 'U+2001 EM QUAD'],
  ['\u2002', 'U+2002 EN SPACE'],
  ['\u2003', 'U+2003 EM SPACE'],
  ['\u2004', 'U+2004 THREE-PER-EM SPACE'],
  ['\u2005', 'U+2005 FOUR-PER-EM SPACE'],
  ['\u2006', 'U+2006 SIX-PER-EM SPACE'],
  ['\u2007', 'U+2007 FIGURE SPACE'],
  ['\u2008', 'U+2008 PUNCTUATION SPACE'],
  ['\u2009', 'U+2009 THIN SPACE'],
  ['\u200A', 'U+200A HAIR SPACE'],
  ['\u200B', 'U+200B ZERO WIDTH SPACE'],
  ['\u2028', 'U+2028 LINE SEPARATOR'],
  ['\u2029', 'U+2029 PARAGRAPH SEPARATOR'],
  ['\u202F', 'U+202F NARROW NO-BREAK SPACE'],
  ['\u205F', 'U+205F MEDIUM MATHEMATICAL SPACE'],
  ['\u3000', 'U+3000 IDEOGRAPHIC SPACE'],
  ['\uFEFF', 'U+FEFF ZERO WIDTH NO-BREAK SPACE'],
]);

// Characters without width, which are removed rather than replaced
const ZERO_WIDTH_CHARACTERS = new Set(['\u180E', '\u200B', '\uFEFF']);

const BYTE_ORDER_MARK = '\uFEFF';
const ESCAPE = '\\';

type IrregularWhitespace = { index: number; character: string; description: string };

const ruleImpl: stylelint.RuleBase = (primary: unknown) => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, { actual: primary });
    const source = root.source;
    if (!validOptions || !source?.input) {
      return;
    }
    const rootOffset = source.start?.offset ?? 0;
    const report = (node: PostCSS.Node, { index, character, description }: IrregularWhitespace) => {
      stylelint.utils.report({
        ruleName,
        result,
        message: ZERO_WIDTH_CHARACTERS.has(character)
          ? messages.remove(description)
          : messages.replace(description),
        node,
        index,
        endIndex: index + 1,
      });
    };
    // Embedded blocks of HTML and Vue files have their own input, starting at the block
    for (const [, text, start] of tokenize({ css: source.input.css }).filter(isCode)) {
      for (const found of irregularWhitespaces(text, start)) {
        if (!(found.character === BYTE_ORDER_MARK && rootOffset + found.index === 0)) {
          report(root, found);
        }
      }
    }
    // Whitespace separates the cells of grid areas, unlike the text of other strings
    root.walkDecls((decl: PostCSS.Declaration) => {
      for (const { text, index } of gridAreaStrings(decl)) {
        for (const found of irregularWhitespaces(text, index)) {
          report(decl, found);
        }
      }
    });
  };
};

/**
 * Comments, URLs and strings hold text rather than code.
 */
function isCode(token: CSSToken): boolean {
  return !(
    isTokenComment(token) ||
    isTokenURL(token) ||
    isTokenBadURL(token) ||
    isTokenString(token) ||
    isTokenBadString(token)
  );
}

/**
 * Finds irregular whitespace in source text starting at the given index, except in escape
 * sequences, which write characters on purpose.
 */
function irregularWhitespaces(text: string, start: number): IrregularWhitespace[] {
  const found: IrregularWhitespace[] = [];
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    const description = IRREGULAR_WHITESPACES.get(character);
    if (character === ESCAPE) {
      i++;
    } else if (description !== undefined) {
      found.push({ index: start + i, character, description });
    }
  }
  return found;
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
