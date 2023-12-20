/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
const DEFAULT_AVERAGE_LINE_LENGTH_THRESHOLD = 200;

export function minificationAssessor(filename: string, input: string) {
  return !(
    hasMinifiedFilename(filename) ||
    (isMinifiableFilename(filename) && hasExcessiveAverageLineLength(input))
  );
}

function isMinifiableFilename(filename: string) {
  return filename.endsWith('.js') || filename.endsWith('.css');
}

function hasMinifiedFilename(filename: string) {
  return (
    filename.endsWith('.min.js') ||
    filename.endsWith('-min.js') ||
    filename.endsWith('.min.css') ||
    filename.endsWith('-min.css')
  );
}

function hasExcessiveAverageLineLength(
  input: string,
  size: number = DEFAULT_AVERAGE_LINE_LENGTH_THRESHOLD,
) {
  return getAverageLineLength(input) > size;
}

function getAverageLineLength(input: string) {
  const lines = input.split('\n');
  const totalLength = lines.reduce((acc, line) => acc + line.length, 0);
  return totalLength / lines.length;
}
