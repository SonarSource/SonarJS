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

export function filterSize(filePath: string, input: string, maxSize: number) {
  const exceedsLimit = getBytes(input) > maxSize * 1000;
  if (exceedsLimit) {
    debug(
      `File ${filePath} was excluded because it exceeds the maximum size of ${maxSize} KB. You can modify the maximum size with the property sonar.javascript.maxFileSize (in KB).`,
    );
  }
  return !exceedsLimit;
}

function getBytes(input: string) {
  return Buffer.byteLength(input, 'utf8');
}
