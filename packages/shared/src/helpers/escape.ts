/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
/**
 * Escape non-ascii characters with unicode sequence \uXXXX
 *
 * @param s string to escape
 */
export function unicodeEscape(s: string): string {
  return s
    .split('')
    .map(char => {
      const charCode = char.charCodeAt(0);
      return charCode < 32 || charCode > 127 ? unicodeCharEscape(charCode) : char;
    })
    .join('');
}

function padWithLeadingZeros(s: string) {
  return new Array(5 - s.length).join('0') + s;
}

function unicodeCharEscape(charCode: number) {
  return '\\u' + padWithLeadingZeros(charCode.toString(16));
}
