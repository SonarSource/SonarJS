import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('no-classic guard rejects an absolute compiler copy outside node_modules before execution', () => {
  const directory = fs.mkdtempSync(path.join(root, 'tools/ts7-benchmark/out/classic-copy-'));
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: 'typescript', version: '6.0.3' }),
  );
  const marker = path.join(directory, 'executed');
  const module = path.join(directory, 'compiler.cjs');
  fs.writeFileSync(module, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'bad');`);
  const child = spawnSync(
    process.execPath,
    ['--import', './tools/ts7-benchmark/no-classic-guard.mjs', module],
    { cwd: root, encoding: 'utf8' },
  );
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, /Classic TypeScript execution is forbidden/);
  assert.equal(fs.existsSync(marker), false);
});
