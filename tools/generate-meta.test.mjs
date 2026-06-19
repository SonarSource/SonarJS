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
    const result = runGenerateMeta(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readFileSync(fixture.commandLog, 'utf8').trimEnd().split('\n'),
      ['npm run ensure-rule-data', 'npm run generate-meta:raw'],
    );
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('uses the PATH npm stub even when parent npm_execpath is set', () => {
  const fixture = createFixture();
  try {
    const result = runGenerateMeta(fixture, {
      npm_execpath: '/tmp/fake-npm-cli.js',
      npm_config_user_agent: 'npm/test',
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

function runGenerateMeta(fixture, injectedEnv = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: fixture.repoRoot,
    env: createChildEnv(fixture, injectedEnv),
    text: true,
    encoding: 'utf8',
  });
}

function writeExecutable(path, content) {
  writeFileSync(path, content, { mode: 0o755 });
}

function createChildEnv(fixture, injectedEnv = {}) {
  const env = {
    ...process.env,
    ...injectedEnv,
  };
  delete env.npm_execpath;
  for (const key of Object.keys(env)) {
    if (key.startsWith('npm_config_')) {
      delete env[key];
    }
  }
  return {
    ...env,
    PATH: `${fixture.binDir}:${process.env.PATH}`,
  };
}
