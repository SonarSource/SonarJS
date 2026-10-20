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
import type PostCSS from 'postcss';

export const VENDOR_PREFIX = /^-(?:webkit|moz|ms|o|khtml)-/i;

const LEGACY_IE_FILTER_FUNCTION = /^\s*(?:progid:|alpha\()/i;
const LEGACY_IE_FILTER_KEYWORDS = new Set(['fliph', 'flipv', 'gray', 'invert', 'xray']);

/**
 * Declarations using the filter syntax of old Internet Explorer versions, such as
 * `filter: progid:DXImageTransform.Microsoft.Alpha(opacity=50)`, which follows no CSS grammar.
 */
export function isLegacyIeFilter(decl: PostCSS.Declaration): boolean {
  const property = decl.prop.toLowerCase();
  return property === '-ms-filter' || (property === 'filter' && isLegacyIeFilterValue(decl.value));
}

function isLegacyIeFilterValue(value: string): boolean {
  return (
    LEGACY_IE_FILTER_FUNCTION.test(value) ||
    value
      .trim()
      .split(/\s+/)
      .every((keyword: string) => LEGACY_IE_FILTER_KEYWORDS.has(keyword.toLowerCase()))
  );
}
