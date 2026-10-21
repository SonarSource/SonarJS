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
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const validator = fileURLToPath(
  new URL('../../../tools/validate-cyclonedx-bom.mjs', import.meta.url),
);

describe('bundled dependency SBOM validation', () => {
  function validate(npmNames: string[], mergedNames = npmNames, windowsSeparators = false) {
    const directory = mkdtempSync(path.join(tmpdir(), 'sonarjs-bom-'));
    const writeJson = (file: string, value: unknown) =>
      writeFileSync(path.join(directory, file), JSON.stringify(value));
    const bom = (names: string[]) => ({
      components: names.map(name => ({ purl: `pkg:npm/${name}@6.0.3` })),
    });
    try {
      mkdirSync(path.join(directory, 'node_modules', 'compiler-alias'), { recursive: true });
      writeJson('node_modules/compiler-alias/package.json', {
        name: 'typescript',
        version: '6.0.3',
      });
      writeJson('npm.json', bom(npmNames));
      writeJson('merged.json', bom(mergedNames));
      const input = windowsSeparators
        ? String.raw`node_modules\compiler-alias\lib\typescript.js`
        : 'node_modules/compiler-alias/lib/typescript.js';
      writeJson('esbuild.json', { inputs: { [input]: {} } });
      return execFileSync(
        process.execPath,
        [validator, 'npm.json', 'merged.json', 'esbuild.json'],
        {
          cwd: directory,
          encoding: 'utf8',
          stdio: 'pipe',
          // The tools CLI is excluded from coverage. Its fixture cwd cannot resolve
          // the repository-relative NYC loader inherited from bridge:test:cov.
          env: { ...process.env, NODE_OPTIONS: undefined },
        },
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  it('matches npm aliases to their published package identity on both path formats', () => {
    for (const windowsSeparators of [false, true]) {
      assert.match(
        validate(['typescript'], undefined, windowsSeparators),
        /CycloneDX coverage verified/,
      );
    }
  });

  it('rejects a BOM containing only the alias directory name', () => {
    assert.throws(
      () => validate(['compiler-alias']),
      /npm BOM omits packages bundled by esbuild:\r?\ntypescript/,
    );
  });

  it('still rejects package URLs missing from the merged BOM', () => {
    assert.throws(() => validate(['typescript'], []), /merged BOM omits npm package URLs/);
  });
});
