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
import ts from 'typescript';
import { getFileSystemCaseSensitivity } from '../../../shared/src/fs-cache/hook.js';

/** An active archive owns filesystem semantics; native analysis uses TypeScript's probe. */
export function isFileSystemCaseSensitive(): boolean {
  return getFileSystemCaseSensitivity() ?? ts.sys.useCaseSensitiveFileNames;
}

export function canonicalFileName(fileName: string): string {
  return isFileSystemCaseSensitive() ? fileName : fileName.toLowerCase();
}
