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
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import * as nycLoader from './nyc-esm-loader.js';

test('extracts an external source map from a sourceMappingURL comment', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'sonarjs-nyc-loader-'));
  try {
    const jsFile = join(fixtureDir, 'compiled.js');
    const mapFile = `${jsFile}.map`;
    const expected = {
      version: 3,
      file: 'compiled.js',
      sources: ['../../packages/analysis/src/jsts/rules/S2871/rule.ts'],
      names: [],
      mappings: 'AAAA',
    };

    writeFileSync(jsFile, 'export const value = 42;\n//# sourceMappingURL=compiled.js.map\n');
    writeFileSync(mapFile, JSON.stringify(expected));

    const actual =
      typeof nycLoader.extractSourceMap === 'function'
        ? nycLoader.extractSourceMap(
            'export const value = 42;\n//# sourceMappingURL=compiled.js.map\n',
            jsFile,
          )
        : undefined;

    assert.deepEqual(actual, expected);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
