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
import { extname } from 'node:path/posix';
import type { NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';

const JAVASCRIPT_CODE_FILE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx'] as const;
const TYPESCRIPT_CODE_FILE_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'] as const;
const JS_TS_CODE_FILE_EXTENSIONS = [
  ...JAVASCRIPT_CODE_FILE_EXTENSIONS,
  ...TYPESCRIPT_CODE_FILE_EXTENSIONS,
] as const;

const JS_TS_CODE_FILE_EXTENSION_SET = new Set<string>(JS_TS_CODE_FILE_EXTENSIONS);

export function isJsTsCodeFileByExtension(filePath: NormalizedAbsolutePath) {
  return JS_TS_CODE_FILE_EXTENSION_SET.has(extname(filePath).toLowerCase());
}
