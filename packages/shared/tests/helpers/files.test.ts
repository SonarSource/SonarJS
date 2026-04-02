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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile, normalizeToAbsolutePath } from '../../src/helpers/files.js';

describe('readFile', () => {
  it('should read a file', async () => {
    const contents = await readFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'fixtures', 'file.js')),
    );
    expect(contents).toBe('file();');
  });

  it('should remove any BOM header', async () => {
    const contents = await readFile(
      normalizeToAbsolutePath(path.join(import.meta.dirname, 'fixtures', 'bom.js')),
    );
    expect(contents).toBe('bom();');
  });
});
