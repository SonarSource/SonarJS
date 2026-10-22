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
import type PostCSS from 'postcss';
import { isTokenBadString, isTokenString, tokenize } from '@csstools/css-tokenizer';

// Properties whose strings define grid areas, where whitespace separates the cells
const GRID_AREA_PROPERTIES = new Set(['grid-template-areas', 'grid-template', 'grid']);

const QUOTE_LENGTH = 1;

/**
 * The source text between the quotes of an area string, with escape sequences kept as written,
 * and its index from the start of the declaration, as `stylelint.utils.report()` expects.
 */
export type GridAreaString = { text: string; index: number };

/**
 * Finds the area strings of `grid-template-areas`, `grid-template` and `grid` declarations.
 */
export function gridAreaStrings(decl: PostCSS.Declaration): GridAreaString[] {
  if (!GRID_AREA_PROPERTIES.has(decl.prop.toLowerCase())) {
    return [];
  }
  // the raw value keeps the comments, so that indexes match the source
  const value = decl.raws.value?.raw ?? decl.value;
  const valueIndex = decl.prop.length + (decl.raws.between ?? ':').length;
  const strings: GridAreaString[] = [];
  for (const token of tokenize({ css: value })) {
    if (isTokenString(token) || isTokenBadString(token)) {
      const [, raw, start] = token;
      // a bad string is unterminated, so it has no closing quote
      const end = isTokenString(token) ? raw.length - QUOTE_LENGTH : raw.length;
      strings.push({
        text: raw.slice(QUOTE_LENGTH, end),
        index: valueIndex + start + QUOTE_LENGTH,
      });
    }
  }
  return strings;
}
