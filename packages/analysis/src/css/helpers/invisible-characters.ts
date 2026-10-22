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
// Invisible characters from U+2000 to U+200F, such as U+200B ZERO WIDTH SPACE
const INVISIBLE_CHARACTER = /[\u2000-\u200F]/;
const INVISIBLE_CHARACTERS = new RegExp(INVISIBLE_CHARACTER.source, 'g');

export function hasInvisibleCharacters(code: string): boolean {
  return INVISIBLE_CHARACTER.test(code);
}

/**
 * Replaces each invisible character with a space, which keeps every location in the code.
 */
export function replaceInvisibleCharacters(code: string): string {
  return code.replaceAll(INVISIBLE_CHARACTERS, ' ');
}

/**
 * The code as written of the files being linted with their invisible characters replaced, by
 * their code as linted
 */
const codesAsWritten = new Map<string, string>();

/**
 * Lints the code with its invisible characters replaced, while rules can still read the code as
 * written with `sourceAsWritten()`.
 */
export async function lintWithInvisibleCharactersReplaced<T>(
  code: string,
  lint: (sanitizedCode: string) => Promise<T>,
): Promise<T> {
  const sanitizedCode = replaceInvisibleCharacters(code);
  codesAsWritten.set(sanitizedCode, code);
  try {
    return await lint(sanitizedCode);
  } finally {
    codesAsWritten.delete(sanitizedCode);
  }
}

/**
 * The source text of a root as written, which differs from its input when its invisible
 * characters were replaced. Embedded blocks of HTML and Vue files start at `offset` in the file.
 */
export function sourceAsWritten(css: string, offset: number): string {
  for (const [sanitizedCode, code] of codesAsWritten) {
    if (sanitizedCode.startsWith(css, offset)) {
      return code.slice(offset, offset + css.length);
    }
  }
  return css;
}
