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
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(process.cwd() + '/package.json');
const { providers } = require('./packages/typescript/providers.json');
const selectProvider = require(path.join(process.cwd(), 'packages/typescript/selection.cjs'));
// The same tool module is used by source tests and compiled tests in lib/.
const { compilerProviderPlugin, compilerInputs } = await import(
  pathToFileURL(path.join(process.cwd(), 'tools/compiler-provider-plugin.mjs')).href
);

for (const backend of Object.keys(providers)) {
  it(`packages only ${backend}, bakes in its default and rejects other runtime selections`, async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'sonarjs-compiler-bundle-'));
    const outfile = path.join(directory, 'compiler.cjs');
    const provider = selectProvider(backend);
    try {
      const result = await build({
        stdin: {
          contents: `const ts = require('typescript'); console.log(ts.createSourceFile('main.ts', 'const value = 1;', ts.ScriptTarget.Latest).statements.length);`,
          resolveDir: process.cwd(),
        },
        outfile,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        metafile: true,
        plugins: [compilerProviderPlugin(provider)],
        logLevel: 'silent',
      });
      const inputs = compilerInputs(provider, result.metafile!.inputs);
      const loaded = Object.values(providers)
        .filter((other: any) => other !== providers[backend])
        .map((other: any) => other.module.replace('./', 'packages/typescript/'));
      assert.ok(loaded.every((file: string) => !Object.hasOwn(inputs, file)));
      assert.equal(
        execFileSync(process.execPath, [outfile], {
          env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: undefined },
          encoding: 'utf8',
        }).trim(),
        '1',
      );
      assert.throws(
        () =>
          execFileSync(process.execPath, [outfile], {
            env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'not-in-this-bundle' },
            stdio: 'pipe',
          }),
        /Unknown compiler provider/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

it('rejects compiler SDK imports outside their owning provider', async () => {
  await assert.rejects(
    build({
      stdin: {
        contents: "require('typescript-classic');",
        resolveDir: process.cwd(),
      },
      bundle: true,
      platform: 'node',
      write: false,
      plugins: [compilerProviderPlugin(selectProvider('ts6'))],
      logLevel: 'silent',
    }),
    /Private compiler SDK import outside its provider/,
  );
});
