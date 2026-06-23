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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./ensure-rule-data.mjs', import.meta.url));
const statePath = join('resources', 'rule-data-state.json');
const javascriptRspecShaPath = join(
  'sonar-plugin',
  'javascript-checks',
  'src',
  'main',
  'resources',
  'rspec.sha',
);
const cssRspecShaPath = join('sonar-plugin', 'css', 'src', 'main', 'resources', 'rspec.sha');

test('skips rule data generation when the visible state is current', () => {
  const fixture = createFixture();
  try {
    writeRuleDataState(fixture.repoRoot, {
      version: 1,
      step: 'generate-rule-data:maven',
      head: fixture.head,
      rootRspecSha: null,
    });

    const result = runEnsureRuleData(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(fixture.commandLog), false);
  } finally {
    cleanupFixture(fixture);
  }
});

test('skips rule data generation when git is unavailable but prepared data is current', () => {
  const fixture = createFixture({ createGitBinary: false });
  try {
    writeRuleDataState(fixture.repoRoot, {
      version: 1,
      step: 'generate-rule-data:maven',
      head: fixture.head,
      rootRspecSha: null,
    });

    const result = runEnsureRuleData(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(fixture.commandLog), false);
  } finally {
    cleanupFixture(fixture);
  }
});

test('regenerates rule data when the root rspec pin changes', () => {
  const fixture = createFixture();
  try {
    writeFileSync(join(fixture.repoRoot, 'rspec.sha'), 'new-rspec-pin\n');
    writeRuleDataState(fixture.repoRoot, {
      version: 1,
      step: 'generate-rule-data:maven',
      head: fixture.head,
      rootRspecSha: 'old-rspec-pin',
    });

    const result = runEnsureRuleData(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.commandLog, 'utf8'), 'npm run generate-rule-data:maven\n');
    assert.deepEqual(readRuleDataState(fixture.repoRoot), {
      version: 1,
      step: 'generate-rule-data:maven',
      head: fixture.head,
      rootRspecSha: 'new-rspec-pin',
    });
  } finally {
    cleanupFixture(fixture);
  }
});

test('clears generated rspec pins before regenerating stale unpinned rule data', () => {
  const fixture = createFixture({ failWhenNpmSeesGeneratedPins: true });
  try {
    writeRuleDataState(fixture.repoRoot, {
      version: 1,
      step: 'generate-rule-data:maven',
      head: 'old-head',
      rootRspecSha: null,
    });

    const result = runEnsureRuleData(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.commandLog, 'utf8'), 'npm run generate-rule-data:maven\n');
    assert.equal(existsSync(join(fixture.repoRoot, javascriptRspecShaPath)), false);
    assert.equal(existsSync(join(fixture.repoRoot, cssRspecShaPath)), false);
  } finally {
    cleanupFixture(fixture);
  }
});

test('preserves generated rspec pins when prepared rule data has no state stamp yet', () => {
  const fixture = createFixture({ failWhenNpmDoesNotSeeGeneratedPins: true });
  try {
    const result = runEnsureRuleData(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.commandLog, 'utf8'), 'npm run generate-rule-data:maven\n');
    assert.equal(readFileSync(join(fixture.repoRoot, javascriptRspecShaPath), 'utf8'), 'js\n');
    assert.equal(readFileSync(join(fixture.repoRoot, cssRspecShaPath), 'utf8'), 'css\n');
  } finally {
    cleanupFixture(fixture);
  }
});

test('regenerates rule data when generated output directories are empty', () => {
  const fixture = createFixture({ createRuleFiles: false });
  try {
    writeRuleDataState(fixture.repoRoot, {
      version: 1,
      step: 'generate-rule-data:maven',
      head: fixture.head,
      rootRspecSha: null,
    });

    const result = runEnsureRuleData(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.commandLog, 'utf8'), 'npm run generate-rule-data:maven\n');
  } finally {
    cleanupFixture(fixture);
  }
});

test('regenerates rule data when generated outputs are missing', () => {
  const fixture = createFixture({ createRuleDataOutputs: false });
  try {
    writeRuleDataState(fixture.repoRoot, {
      version: 1,
      step: 'generate-rule-data:maven',
      head: fixture.head,
      rootRspecSha: null,
    });

    const result = runEnsureRuleData(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.commandLog, 'utf8'), 'npm run generate-rule-data:maven\n');
  } finally {
    cleanupFixture(fixture);
  }
});

test('uses the PATH npm stub even when parent npm_execpath is set', () => {
  const fixture = createFixture({ createRuleDataOutputs: false });
  try {
    const result = withTemporaryNpmEnvironment(fixture, () => runEnsureRuleData(fixture));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.commandLog, 'utf8'), 'npm run generate-rule-data:maven\n');
  } finally {
    cleanupFixture(fixture);
  }
});

function createFixture({
  createRuleDataOutputs = true,
  createRuleFiles = true,
  createGitBinary = true,
  failWhenNpmSeesGeneratedPins = false,
  failWhenNpmDoesNotSeeGeneratedPins = false,
} = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), 'sonarjs-rule-data-'));
  const binDir = join(repoRoot, 'bin');
  const commandLog = join(repoRoot, 'commands.log');
  const head = 'abc123';

  mkdirSync(binDir);
  writeFileSync(
    join(repoRoot, 'package.json'),
    '{"scripts":{"generate-rule-data:maven":"echo"}}\n',
  );
  if (createGitBinary) {
    writeExecutable(
      join(binDir, 'git'),
      `#!/bin/sh
set -eu
if [ "$1 $2" = "rev-parse HEAD" ]; then
  printf '${head}\\n'
  exit 0
fi
exit 1
`,
    );
  }
  writeExecutable(
    join(binDir, 'npm'),
    `#!/bin/sh
set -eu
if ${failWhenNpmSeesGeneratedPins ? 'true' : 'false'} && { [ -e '${join(repoRoot, javascriptRspecShaPath)}' ] || [ -e '${join(repoRoot, cssRspecShaPath)}' ]; }; then
  printf 'generated rspec pins were still present\\n' >&2
  exit 42
fi
if ${failWhenNpmDoesNotSeeGeneratedPins ? 'true' : 'false'} && { ! [ -e '${join(repoRoot, javascriptRspecShaPath)}' ] || ! [ -e '${join(repoRoot, cssRspecShaPath)}' ]; }; then
  printf 'generated rspec pins were missing\\n' >&2
  exit 43
fi
printf 'npm %s\\n' "$*" >> '${commandLog}'
exit 0
`,
  );
  writeFileSync(
    join(repoRoot, 'fake-npm-cli.js'),
    `import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(commandLog)}, 'npm_execpath run ' + process.argv.slice(2).join(' ') + '\\n');
`,
  );

  if (createRuleDataOutputs) {
    createPreparedRuleDataOutputs(repoRoot, { createRuleFiles });
  }

  return { repoRoot, binDir, commandLog, head };
}

function createPreparedRuleDataOutputs(repoRoot, { createRuleFiles }) {
  const javascriptRulesDir = join(
    repoRoot,
    'sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript',
  );
  const cssRulesDir = join(
    repoRoot,
    'sonar-plugin/css/src/main/resources/org/sonar/l10n/css/rules/css',
  );
  mkdirSync(javascriptRulesDir, { recursive: true });
  mkdirSync(cssRulesDir, { recursive: true });
  writeFileSync(join(repoRoot, javascriptRspecShaPath), 'js\n');
  writeFileSync(join(repoRoot, cssRspecShaPath), 'css\n');
  if (createRuleFiles) {
    writeFileSync(join(javascriptRulesDir, 'S0001.json'), '{}\n');
    writeFileSync(join(cssRulesDir, 'S0002.json'), '{}\n');
  }
}

function runEnsureRuleData(fixture, injectedEnv = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: fixture.repoRoot,
    env: createChildEnv(fixture, injectedEnv),
    text: true,
    encoding: 'utf8',
  });
}

function cleanupFixture(fixture) {
  rmSync(fixture.repoRoot, { recursive: true, force: true });
}

function readRuleDataState(repoRoot) {
  return JSON.parse(readFileSync(join(repoRoot, statePath), 'utf8'));
}

function writeRuleDataState(repoRoot, state) {
  mkdirSync(join(repoRoot, 'resources'), { recursive: true });
  writeFileSync(join(repoRoot, statePath), `${JSON.stringify(state, null, 2)}\n`);
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

function withTemporaryNpmEnvironment(fixture, callback) {
  const previousNpmExecPath = process.env.npm_execpath;
  const previousUserAgent = process.env.npm_config_user_agent;
  process.env.npm_execpath = join(fixture.repoRoot, 'fake-npm-cli.js');
  process.env.npm_config_user_agent = 'npm/test';
  try {
    return callback();
  } finally {
    restoreProcessEnv('npm_execpath', previousNpmExecPath);
    restoreProcessEnv('npm_config_user_agent', previousUserAgent);
  }
}

function restoreProcessEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
