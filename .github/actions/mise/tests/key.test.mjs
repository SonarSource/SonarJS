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
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function key(overrides = {}) {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'mise-key-test-'));
  try {
    const output = path.join(temporary, 'output');
    execFileSync(process.execPath, [new URL('../identity/key.mjs', import.meta.url).pathname], {
      env: {
        ...process.env,
        MISE_VERSION_INPUT: '2026.10.20',
        MISE_INSTALL_INPUT: 'node',
        MISE_CONFIG_HASH: 'config',
        MISE_NODE_VERSION: '24',
        ...overrides,
        GITHUB_OUTPUT: output,
      },
    });
    return readFileSync(output, 'utf8');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

test('matrix Node overrides cannot reuse a different toolchain identity', () => {
  assert.notEqual(key(), key({ MISE_NODE_VERSION: '22' }));
});
test('the config, mise binary and installed tool subset each invalidate the cache', () => {
  for (const override of [
    { MISE_CONFIG_HASH: 'other-config' },
    { MISE_VERSION_INPUT: 'other-version' },
    { MISE_INSTALL_INPUT: 'java maven' },
  ]) {
    assert.notEqual(key(), key(override));
  }
});
test('unrelated environment variables do not churn the toolchain cache', () => {
  assert.equal(key(), key({ AN_UNRELATED_VALUE: 'different' }));
});
