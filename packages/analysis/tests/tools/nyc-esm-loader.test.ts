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
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { pathToFileURL } from 'node:url';

type LoadHook = (
  url: string,
  context: { format: string },
  nextLoad: () => Promise<{ format: string; source: string }>,
) => Promise<{ source: string | Uint8Array }>;

it('uses external source maps when instrumenting compiled JavaScript', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.nyc-esm-loader-test-'));

  try {
    const { load } = (await import(
      pathToFileURL(join(process.cwd(), 'tools/nyc-esm-loader.js')).href
    )) as { load: LoadHook };
    const jsPath = join(tempDir, 'sample.js');
    const sourcePath = 'packages/analysis/src/sample.ts';
    const compiledSource = [
      'export function answer() {',
      '  return 42;',
      '}',
      '//# sourceMappingURL=sample.js.map',
    ].join('\n');

    writeFileSync(jsPath, compiledSource);
    writeFileSync(
      `${jsPath}.map`,
      JSON.stringify({
        version: 3,
        file: 'sample.js',
        sourceRoot: '',
        sources: [sourcePath],
        sourcesContent: ['export function answer(): number {\n  return 42;\n}\n'],
        names: [],
        mappings: '',
      }),
    );

    const result = await load(pathToFileURL(jsPath).href, { format: 'module' }, async () => ({
      format: 'module',
      source: compiledSource,
    }));
    const instrumentedSource = String(result.source);

    assert.match(instrumentedSource, /inputSourceMap/);
    assert.match(instrumentedSource, new RegExp(sourcePath));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
