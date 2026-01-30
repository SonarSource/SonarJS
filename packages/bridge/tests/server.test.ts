/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import * as path from 'node:path';
import { AddressInfo } from 'node:net';
import { request } from './tools/index.js';
import * as http from 'node:http';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import assert from 'node:assert';
import { createWorker } from '../../shared/src/helpers/worker.js';
import { join } from 'node:path/posix';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { BridgeRequest } from '../src/request.js';
import { Worker } from 'node:worker_threads';

const workerPath = path.join(import.meta.dirname, '..', '..', '..', 'server.mjs');
const port = 0;

describe('server', () => {
  it('should start', async ({ mock }) => {
    console.log = mock.fn(console.log);

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

    const fileType = 'MAIN';

    expect(JSON.parse(await requestAnalyzeJs(server, fileType))).toStrictEqual({
      parsingError: {
        code: 'LINTER_INITIALIZATION',
        message: 'Linter does not exist. Did you call /init-linter?',
      },
    });
    await request(server, '/close', 'POST');
    await serverClosed;
  });

  it('should accept a ws request', async t => {
    for (const worker of [await createWorker(workerPath), undefined]) {
      await t.test(worker ? 'with worker' : 'without worker', async () => {
        const fixtures = join(import.meta.dirname, 'fixtures', 'router');
        const filePath = normalizeToAbsolutePath(join(fixtures, 'file.ts'));

        const { response, messages } = await testWSWithTypedRequest(worker, {
          type: 'on-analyze-project',
          data: {
            rules: [
              {
                key: 'S4621',
                configurations: [],
                fileTypeTargets: ['MAIN'],
                language: 'ts',
                analysisModes: ['DEFAULT'],
              },
            ],
            configuration: {
              baseDir: fixtures,
            },
            files: {
              [filePath]: { fileType: 'MAIN', filePath },
            },
          },
        });

        expect(response).toEqual({
          messageType: 'meta',
          warnings: [],
        });
        expect(messages.length).toEqual(1);
        const {
          issues: [issue],
        } = messages[0];
        expect(issue).toEqual(
          expect.objectContaining({
            ruleId: 'S4621',
            line: 1,
            column: 28,
            endLine: 1,
            endColumn: 35,
            message: `Remove this duplicated type or replace with another one.`,
          }),
        );
      });
    }
  });

  it('should handle errors in ws communication', async t => {
    for (const worker of [await createWorker(workerPath), undefined]) {
      await t.test(worker ? 'with worker' : 'without worker', async () => {
        const { response, messages } = await testWSWithWorker(
          worker,
          JSON.stringify({
            type: 'on-analyze-project',
            data: {},
          }),
        );
        expect(response).toMatchObject({
          error: {
            code: 'GENERAL_ERROR',
          },
        });
        expect(messages.length).toEqual(0);
      });
    }
  });

  it('should log memory', async ({ mock }) => {
    console.log = mock.fn(console.log);
    const { server, serverClosed } = await start(port, undefined, undefined, true);
    await request(server, '/analyze-project', 'POST', {
      tsConfig: path.join(import.meta.dirname, 'fixtures', 'router', 'tsconfig.json'),
    });
    await request(server, '/close', 'POST');
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs.some(message => message.match(/total_heap_size/))).toEqual(true);
    await serverClosed;
  });

  it('should not log memory', async ({ mock }) => {
    console.log = mock.fn(console.log);
    const { server, serverClosed } = await start(port, undefined, undefined);
    await request(server, '/create-program', 'POST', {
      tsConfig: path.join(import.meta.dirname, 'fixtures', 'router', 'tsconfig.json'),
    });
    await request(server, '/close', 'POST');
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs.some(message => message.match(/total_heap_size/))).toEqual(false);
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
    } = JSON.parse(response);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId,
      }),
    );

    await request(server, '/close', 'POST');
    await serverClosed;
  });

  it('should shut down', async ({ mock }) => {
    console.log = mock.fn(console.log);

    const worker = await createWorker(workerPath);
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

  it('worker crashing should close server', async ({ mock }) => {
    console.log = mock.fn(console.log);

    const worker = await createWorker(workerPath);
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

  it('should timeout', async ({ mock }) => {
    console.log = mock.fn(console.log);
    mock.timers.enable({ apis: ['setTimeout'] });
    const timeout = 500;

    const { server, serverClosed } = await start(
      port,
      '127.0.0.1',
      /* worker */ undefined,
      /* debugMemory */ false,
      timeout,
    );

    expect(server.listening).toBeTruthy();
    expect(await request(server, '/status', 'GET')).toEqual('OK');

    // After 499 ticks, the server is still running
    mock.timers.tick(timeout - 1);
    expect(server.listening).toBeTruthy();
    expect(await request(server, '/status', 'GET')).toEqual('OK');

    // The previous request, restarted the timer. We need to wait for the exact amount of time for the timeout to occur.
    mock.timers.tick(timeout);

    await serverClosed;
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('DEBUG The bridge server shut down');
  });

  it('should support no timeout', async ({ mock }) => {
    mock.timers.enable({ apis: ['setTimeout'] });

    const { server, serverClosed } = await start(
      port,
      '127.0.0.1',
      /* worker */ undefined,
      /* debugMemory */ false,
      0,
    );

    mock.timers.tick(Number.MAX_SAFE_INTEGER);
    expect(server.listening).toBeTruthy();
    expect(await request(server, '/status', 'GET')).toEqual('OK');

    expect(await request(server, '/close', 'POST')).toEqual('');
    await serverClosed;
  });
});

async function testWSWithTypedRequest(worker: Worker | undefined, requestData: BridgeRequest) {
  return await testWSWithWorker(worker, JSON.stringify(requestData));
}

async function testWSWithWorker(worker: Worker | undefined, requestJSON: string) {
  const { server, serverClosed } = await start(port, undefined, worker);
  const wsUrl = `ws://127.0.0.1:${(server.address() as AddressInfo)?.port}/ws`;
  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => {
    ws.onopen = () => {
      resolve('Success');
    };
  });

  const messages: { issues: unknown[] }[] = [];
  const response = await new Promise((resolve, reject) => {
    ws.send(requestJSON);
    ws.onmessage = event => {
      const json = JSON.parse(event.data);
      if (json.messageType === 'fileResult') {
        messages.push(json);
      } else {
        resolve(json);
      }
    };
    ws.onerror = err => {
      reject(err); // Reject if something goes wrong
    };
  });

  await request(server, '/close', 'POST');
  await serverClosed;
  return {
    response,
    messages,
  };
}

async function requestAnalyzeJs(server: http.Server, fileType: string) {
  const filePath = path.join(import.meta.dirname, 'fixtures', 'routing.js');
  const analysisInput = { filePath, fileType };

  return await request(server, '/analyze-jsts', 'POST', analysisInput);
}

function requestInitLinter(server: http.Server, fileType: string, ruleId: string) {
  const config = {
    baseDir: import.meta.dirname,
    rules: [
      {
        key: ruleId,
        configurations: [],
        fileTypeTargets: [fileType],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ],
  };

  return request(server, '/init-linter', 'POST', config);
}
