/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { debug, info } from '../logging.js';
import type { NormalizedAbsolutePath } from '../../../../jsts/src/rules/helpers/index.js';

const READ_CHARACTERS_LIMIT = 2048;
const COMMENT = String.raw`/\*.*\*/`;
const OPERATOR = '[!;+(]';
const OPTIONAL_FUNCTION_NAME = '(?: [_$a-zA-Z][_$a-zA-Z0-9]*)?';
const COMMENT_OPERATOR_FUNCTION = new RegExp(
  COMMENT + String.raw`\s*` + OPERATOR + 'function ?' + OPTIONAL_FUNCTION_NAME + String.raw`\(`,
  's',
);
let hasInfoBeenLogged = false;

export function filterBundle(filePath: NormalizedAbsolutePath, input: string) {
  if (!filterBundleCode(input)) {
    debug(
      `File ${filePath} was excluded because it looks like a bundle. (Disable detection with sonar.javascript.detectBundles=false)`,
    );
    if (!hasInfoBeenLogged) {
      info(
        'Some of the project files were automatically excluded because they looked like generated code. Enable debug logging to see which files were excluded. You can disable bundle detection by setting sonar.javascript.detectBundles=false',
      );
      hasInfoBeenLogged = true;
    }
    return false;
  }
  return true;
}

export function filterBundleCode(input: string) {
  const firstCharacters = input.substring(0, READ_CHARACTERS_LIMIT);
  return !COMMENT_OPERATOR_FUNCTION.test(firstCharacters);
}
