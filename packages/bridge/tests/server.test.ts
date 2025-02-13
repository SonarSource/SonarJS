/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { start } from '../src/server.js';
import * as path from 'path';
import { AddressInfo } from 'net';
import { request } from './tools/index.js';
import * as http from 'http';
import { describe, before, it, mock, Mock } from 'node:test';
import { expect } from 'expect';
import assert from 'node:assert';
import { getContext, setContext } from '../../shared/src/helpers/context.js';
import { createWorker } from '../../shared/src/helpers/worker.js';

const workerPath = path.join(import.meta.dirname, '..', '..', '..', 'server.mjs');

describe('server', () => {
  const port = 0;

  before(() => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should start', async () => {
    console.log = mock.fn();

    const { server, serverClosed } = await start(undefined, undefined);

    expect(server.listening).toBeTruthy();
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;
    assert.equal(consoleLogMock.calls.length, 3);
    assert.match(
      consoleLogMock.calls[0].arguments[0],
      /Memory configuration: OS \(\d+ MB\),( Docker \(\d+ MB\),)? Node.js \(\d+ MB\)\./,
    );
    assert.equal(consoleLogMock.calls[1].arguments[0], `DEBUG Starting the bridge server`);
    assert.equal(
      consoleLogMock.calls[2].arguments[0],
      `DEBUG The bridge server is listening on port ${(server.address() as AddressInfo)?.port}`,
    );

    await request(server, '/close', 'POST');
    await serverClosed;
  });

  it('should fail when linter is not initialized', async () => {
    const { server, serverClosed } = await start(port);

    const ruleId = 'S1116';
    const fileType = 'MAIN';

    expect(JSON.parse(await requestAnalyzeJs(server, fileType))).toStrictEqual({
      parsingError: {
        code: 'LINTER_INITIALIZATION',
        message: 'Linter does not exist. Did you call /init-linter?',
      },
    });

    expect(await requestInitLinter(server, fileType, ruleId)).toBe('OK!');
    const response = await requestAnalyzeJs(server, fileType);
    const {
      issues: [issue],
    } = JSON.parse(response.get('json'));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId,
      }),
    );
    await request(server, '/close', 'POST');
    await serverClosed;
  });

  it('should route service requests', async () => {
    const { server, serverClosed } = await start(port);

    expect(server.listening).toBeTruthy();

    const ruleId = 'S1116';
    const fileType = 'MAIN';

    await requestInitLinter(server, fileType, ruleId);
    const response = await requestAnalyzeJs(server, fileType);

    const {
      issues: [issue],
    } = JSON.parse(response.get('json'));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId,
      }),
    );

    await request(server, '/close', 'POST');
    await serverClosed;
  });

  it('should shut down', async () => {
    console.log = mock.fn();

    const worker = createWorker(workerPath, getContext());
    const { server, serverClosed } = await start(port, undefined, worker);
    expect(server.listening).toBeTruthy();

    await request(server, '/close', 'POST');

    expect(server.listening).toBeFalsy();
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('DEBUG Shutting down the worker');
    await serverClosed;
  });

  it('worker crashing should close server', async () => {
    console.log = mock.fn();

    const worker = createWorker(workerPath, getContext());
    const { server, serverClosed } = await start(port, undefined, worker);
    expect(server.listening).toBeTruthy();

    worker.emit('error', new Error('An error'));
    await worker.terminate();

    expect(server.listening).toBeFalsy();
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('DEBUG The worker thread failed: Error: An error');
    await serverClosed;
  });

  it('should timeout', async () => {
    console.log = mock.fn();

    const { server, serverClosed } = await start(port, '127.0.0.1', undefined, 500);

    await new Promise(r => setTimeout(r, 100));
    expect(server.listening).toBeTruthy();
    await request(server, '/status', 'GET');

    await new Promise(r => setTimeout(r, 100));
    expect(server.listening).toBeTruthy();
    await request(server, '/status', 'GET');

    await serverClosed;
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('DEBUG The bridge server shut down');
    expect(server.listening).toBeFalsy();
  });
});

async function requestAnalyzeJs(server: http.Server, fileType: string): Promise<any> {
  const filePath = path.join(import.meta.dirname, 'fixtures', 'routing.js');
  const analysisInput = { filePath, fileType };

  return await request(server, '/analyze-js', 'POST', analysisInput);
}

function requestInitLinter(server: http.Server, fileType: string, ruleId: string) {
  const config = {
    rules: [
      {
        key: ruleId,
        configurations: [],
        fileTypeTarget: [fileType],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ],
  };

  return request(server, '/init-linter', 'POST', config);
}
