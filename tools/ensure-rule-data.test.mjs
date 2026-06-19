import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
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

const scriptPath = fileURLToPath(new URL('./ensure-rule-data.mjs', import.meta.url));

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
    assert.equal(
      readFileSync(fixture.commandLog, 'utf8'),
      'npm run generate-rule-data:maven\n',
    );
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
    assert.equal(
      readFileSync(fixture.commandLog, 'utf8'),
      'npm run generate-rule-data:maven\n',
    );
  } finally {
    cleanupFixture(fixture);
  }
});

function createFixture({ createRuleDataOutputs = true } = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), 'sonarjs-rule-data-'));
  const binDir = join(repoRoot, 'bin');
  const commandLog = join(repoRoot, 'commands.log');
  const head = 'abc123';

  mkdirSync(binDir);
  writeFileSync(
    join(repoRoot, 'package.json'),
    '{"scripts":{"generate-rule-data:maven":"echo"}}\n',
  );
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
  writeExecutable(
    join(binDir, 'npm'),
    `#!/bin/sh
set -eu
printf 'npm %s\\n' "$*" >> '${commandLog}'
exit 0
`,
  );

  if (createRuleDataOutputs) {
    createPreparedRuleDataOutputs(repoRoot);
  }

  return { repoRoot, binDir, commandLog, head };
}

function createPreparedRuleDataOutputs(repoRoot) {
  mkdirSync(
    join(
      repoRoot,
      'sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript',
    ),
    { recursive: true },
  );
  mkdirSync(
    join(repoRoot, 'sonar-plugin/css/src/main/resources/org/sonar/l10n/css/rules/css'),
    { recursive: true },
  );
  writeFileSync(join(repoRoot, 'sonar-plugin/javascript-checks/src/main/resources/rspec.sha'), 'js\n');
  writeFileSync(join(repoRoot, 'sonar-plugin/css/src/main/resources/rspec.sha'), 'css\n');
}

function runEnsureRuleData(fixture) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: fixture.repoRoot,
    env: {
      ...process.env,
      PATH: `${fixture.binDir}:${process.env.PATH}`,
    },
    text: true,
    encoding: 'utf8',
  });
}

function cleanupFixture(fixture) {
  rmSync(fixture.repoRoot, { recursive: true, force: true });
}

function readRuleDataState(repoRoot) {
  return JSON.parse(readFileSync(join(repoRoot, '.sonarjs-build-state/rule-data.json'), 'utf8'));
}

function writeRuleDataState(repoRoot, state) {
  mkdirSync(join(repoRoot, '.sonarjs-build-state'), { recursive: true });
  writeFileSync(
    join(repoRoot, '.sonarjs-build-state/rule-data.json'),
    `${JSON.stringify(state, null, 2)}\n`,
  );
}

function writeExecutable(path, content) {
  writeFileSync(path, content, { mode: 0o755 });
}
