import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { copyWasmSdk } from './wasm-sdk.mjs';

test('WASM SDK includes revision-matched platform libraries and rejects an incomplete compiler', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-wasm-sdk-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sdk = path.join(root, 'sdk');
  const platform = path.join(root, 'platform');
  const output = path.join(root, 'out');
  for (const directory of [sdk, platform]) {
    fs.mkdirSync(path.join(directory, 'lib'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ type: 'module', version: '7', gitHead: 'revision' }),
    );
  }
  fs.writeFileSync(
    path.join(sdk, 'lib/getExePath.js'),
    'import { fileURLToPath } from "node:url"; export default () => fileURLToPath(new URL("../../platform/lib/tsc", import.meta.url));',
  );
  fs.writeFileSync(path.join(platform, 'lib/lib.d.ts'), '/// <reference lib="es5" />');
  fs.writeFileSync(
    path.join(platform, 'lib/lib.es5.d.ts'),
    'interface Array<T> { length: number }',
  );
  const metadata = await copyWasmSdk(sdk, output, 'revision');
  assert.equal(
    fs.realpathSync(metadata.libraryDirectory),
    fs.realpathSync(path.join(platform, 'lib')),
  );
  assert.equal(Object.keys(metadata.libraries).length, 2);
  assert.equal(
    fs.readFileSync(path.join(output, 'lib/lib.es5.d.ts'), 'utf8'),
    'interface Array<T> { length: number }',
  );
  fs.unlinkSync(path.join(platform, 'lib/lib.d.ts'));
  await assert.rejects(copyWasmSdk(sdk, output, 'revision'), /Missing compiler standard libraries/);
  fs.writeFileSync(
    path.join(platform, 'package.json'),
    JSON.stringify({ version: '7', gitHead: 'other' }),
  );
  await assert.rejects(copyWasmSdk(sdk, output, 'revision'), /standard libraries must match/);
  await assert.rejects(copyWasmSdk(sdk, output, 'other'), /JS SDK must match/);
});

test('self-contained SDK rebuilds remove stale declarations and retain library hashes', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-wasm-sdk-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sdk = path.join(root, 'sdk');
  const output = path.join(root, 'out');
  fs.mkdirSync(path.join(sdk, 'lib'), { recursive: true });
  fs.writeFileSync(
    path.join(sdk, 'package.json'),
    JSON.stringify({ version: '7', gitHead: 'revision' }),
  );
  fs.writeFileSync(path.join(sdk, 'lib/lib.d.ts'), 'interface Object {}');
  const first = await copyWasmSdk(sdk, output, 'revision');
  fs.writeFileSync(path.join(output, 'lib/lib.old.d.ts'), 'stale');
  const second = await copyWasmSdk(sdk, output, 'revision');
  assert.deepEqual(first.libraries, second.libraries);
  assert.equal(fs.existsSync(path.join(output, 'lib/lib.old.d.ts')), false);
});
