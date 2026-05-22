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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';
import { isJsTsCodeFileByExtension } from '../../src/common/file-kinds.js';

describe('file kinds', () => {
  it('accepts fixed JS/TS code file extensions', () => {
    for (const extension of ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']) {
      const path = normalizeToAbsolutePath(`/project/file${extension}`);
      expect(isJsTsCodeFileByExtension(path)).toBe(true);
    }

    expect(isJsTsCodeFileByExtension(normalizeToAbsolutePath('/project/file.d.ts'))).toBe(true);
  });

  it('rejects non-JS/TS code file extensions', () => {
    for (const extension of ['.vue', '.css', '.json']) {
      const path = normalizeToAbsolutePath(`/project/file${extension}`);
      expect(isJsTsCodeFileByExtension(path)).toBe(false);
    }
  });
});
