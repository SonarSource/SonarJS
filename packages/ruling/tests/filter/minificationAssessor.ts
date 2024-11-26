/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  const totalLength = lines.reduce((acc, line) => acc + line.length, 0);
  return totalLength / lines.length;
}
