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
export type CssDialect = 'css' | 'scss' | 'sass' | 'less';
export const PREPROCESSOR_DIALECTS = ['less', 'scss', 'sass'] as const;
export const DEFAULT_CSS_SUFFIXES = ['.css'];

export type CssDialectSuffixes = {
  cssSuffixes?: string[];
  scssSuffixes?: string[];
  sassSuffixes?: string[];
  lessSuffixes?: string[];
};

export function normalizeCssSuffixes(suffixes: string[] = []): string[] {
  return [
    ...new Set(
      suffixes
        .map(suffix => suffix.trim().toLowerCase())
        .filter(Boolean)
        .map(suffix => (suffix.startsWith('.') ? suffix : `.${suffix}`)),
    ),
  ];
}

export function getStylesheetSuffixes(suffixes: CssDialectSuffixes = {}): string[] {
  return [
    ...(suffixes.cssSuffixes ?? DEFAULT_CSS_SUFFIXES),
    ...PREPROCESSOR_DIALECTS.flatMap(dialect => suffixes[`${dialect}Suffixes`] ?? [`.${dialect}`]),
  ];
}

/** Each suffix belongs to exactly one dialect, including plain CSS. */
export function createCssDialectMap(suffixes: CssDialectSuffixes = {}): Map<string, CssDialect> {
  const dialects = new Map<string, CssDialect>();
  for (const dialect of ['css', ...PREPROCESSOR_DIALECTS] as const) {
    for (const suffix of normalizeCssSuffixes(suffixes[`${dialect}Suffixes`] ?? [`.${dialect}`])) {
      const previous = dialects.get(suffix);
      if (previous && previous !== dialect) {
        throw new Error(`CSS suffix ${suffix} is configured for both ${previous} and ${dialect}`);
      }
      dialects.set(suffix, dialect);
    }
  }
  return dialects;
}

export function getCssDialect(filePath: string, dialects: Map<string, CssDialect>): CssDialect {
  const filename = filePath.toLowerCase();
  let selectedDialect: CssDialect = 'css';
  let longestSuffix = 0;
  for (const [suffix, dialect] of dialects) {
    if (suffix.length > longestSuffix && filename.endsWith(suffix)) {
      selectedDialect = dialect;
      longestSuffix = suffix.length;
    }
  }
  return selectedDialect;
}
