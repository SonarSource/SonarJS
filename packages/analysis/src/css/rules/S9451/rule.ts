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
import { IRREGULAR_WHITESPACES } from '../helpers/irregular-whitespaces.js';
import { sourceAsWritten } from '../../helpers/invisible-characters.js';

// Stylelint's `no-irregular-whitespace` is not decorated: it reports form feeds, comments inside
// at-rule preludes and unquoted URLs, and shifts locations after strings it ignores.
const ruleName = meta.bindings[0].stylelintKey;

const messages = stylelint.utils.ruleMessages(ruleName, {
  replace: (character: string) => `Replace this ${character} with ordinary whitespace.`,
  remove: (character: string) => `Remove this ${character}.`,
});

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
    const css = sourceAsWritten(source.input.css, rootOffset);
    for (const [, text, start] of tokenize({ css }).filter(isCode)) {
      for (const found of irregularWhitespaces(text, start)) {
        if (!(found.character === BYTE_ORDER_MARK && rootOffset + found.index === 0)) {
          report(root, found);
        }
      }
    }
    // Whitespace separates the cells of grid areas, unlike the text of other strings
    root.walkDecls((decl: PostCSS.Declaration) => {
      const declOffset = (decl.source?.start?.offset ?? rootOffset) - rootOffset;
      for (const { text, index } of gridAreaStrings(decl)) {
        const start = declOffset + index;
        for (const found of irregularWhitespaces(css.slice(start, start + text.length), index)) {
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
