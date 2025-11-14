/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { debug } from '../logging.js';

const DEFAULT_AVERAGE_LINE_LENGTH_THRESHOLD = 200;

export function filterMinified(filePath: string, input: string) {
  const isMinified =
    hasMinifiedFilename(filePath) ||
    (isMinifiableFilename(filePath) && hasExcessiveAverageLineLength(input));
  if (isMinified) {
    debug(`File ${filePath} was excluded because it looks minified`);
  }
  return !isMinified;
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

export function getAverageLineLength(input: string) {
  const lines = input.split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  const totalLength = lines.reduce((acc, line) => acc + line.length, 0);
  return totalLength / lines.length;
}
