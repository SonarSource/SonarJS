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
