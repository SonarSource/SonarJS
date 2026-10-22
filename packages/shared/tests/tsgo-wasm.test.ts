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
import { execFileSync } from 'node:child_process';
import { it } from 'node:test';

it('WASM streams large ASTs in process, terminates its worker and restarts cleanly', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=commonjs',
      '-e',
      String.raw`
    const assert = require('node:assert/strict');
    const Module = require('node:module');
    const processes = require('node:child_process');
    for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'])
      processes[name] = () => { throw new Error('WASM must not spawn a compiler child'); };
    const workers = require('node:worker_threads');
    const ActualWorker = workers.Worker;
    const started = [], terminated = [];
    let failStartup = true;
    workers.Worker = class extends ActualWorker {
      constructor(filename, options) {
        if (failStartup) {
          options.workerData.executable += '.missing';
          failStartup = false;
        }
        super(filename, options);
        started.push(this.threadId);
      }
      terminate() { terminated.push(this.threadId); return super.terminate(); }
    };
    Module.syncBuiltinESMExports();
    const load = Module._load;
    Module._load = function(name, ...args) {
      if (name === 'typescript-classic' || name.startsWith('typescript-classic/'))
        throw new Error('WASM must not load the TS6 runtime');
      return load.call(this, name, ...args);
    };
    const ts = require('typescript'), lifecycle = require('typescript/lifecycle');
    assert.throws(
      () => ts.createSourceFile('/virtual/startup.ts', 'const x = 1;', ts.ScriptTarget.Latest),
      /TSGo WASM channel is closed: Error: ENOENT/,
    );
    assert.equal(started.length, 1);
    assert.deepEqual(terminated, started);
    started.length = terminated.length = 0;
    const text = 'export const value = "' + 'x'.repeat(2 * 1024 * 1024) + '";';
    const file = ts.createSourceFile('/virtual/large.ts', text, ts.ScriptTarget.Latest, true);
    assert.equal(file.text, text);
    assert.equal(file.statements[0].declarationList.declarations[0].initializer.text.length, 2 * 1024 * 1024);
    assert.equal(started.length, 1);
    assert.ok(started[0] > 0);
    lifecycle.close();
    assert.deepEqual(terminated, started);
    assert.equal(ts.createSourceFile('/virtual/restart.ts', 'const x = 1;', ts.ScriptTarget.Latest).statements.length, 1);
    assert.equal(started.length, 2);
    lifecycle.close();
    assert.deepEqual(terminated, started);
  `,
    ],
    {
      env: {
        ...process.env,
        SONARJS_TYPESCRIPT_BACKEND: 'tsgo-wasm',
        // Real CI environments exceed Go's 8 KiB argv/environment allocation.
        SONARJS_WASM_TEST_ENV: 'x'.repeat(20_000),
      },
      timeout: 30_000,
      stdio: 'pipe',
    },
  );
});
