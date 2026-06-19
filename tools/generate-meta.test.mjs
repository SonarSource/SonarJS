import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./generate-meta.mjs', import.meta.url));

test('runs rule-data freshness check before raw metadata generation', () => {
  const fixture = createFixture();
  try {
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: fixture.repoRoot,
      env: {
        ...process.env,
        PATH: `${fixture.binDir}:${process.env.PATH}`,
      },
      text: true,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readFileSync(fixture.commandLog, 'utf8').trimEnd().split('\n'),
      ['npm run ensure-rule-data', 'npm run generate-meta:raw'],
    );
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

function createFixture() {
  const repoRoot = mkdtempSync(join(tmpdir(), 'sonarjs-generate-meta-'));
  const binDir = join(repoRoot, 'bin');
  const commandLog = join(repoRoot, 'commands.log');

  mkdirSync(binDir);
  writeExecutable(
    join(binDir, 'npm'),
    `#!/bin/sh
set -eu
printf 'npm %s\\n' "$*" >> '${commandLog}'
exit 0
`,
  );

  return { repoRoot, binDir, commandLog };
}

function writeExecutable(path, content) {
  writeFileSync(path, content, { mode: 0o755 });
}
