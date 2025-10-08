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
import * as path from 'node:path';
import { AddressInfo } from 'node:net';
import { request } from './tools/index.js';
import * as http from 'node:http';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import assert from 'node:assert';
import { createWorker } from '../../shared/src/helpers/worker.js';
import { join } from 'node:path/posix';
import { toUnixPath } from '../../shared/src/helpers/files.js';
import { BridgeRequest } from '../src/request.js';
import { Worker } from 'node:worker_threads';

const workerPath = `file://${path.join(import.meta.dirname, '..', '..', '..', 'server.mjs')}`;
const port = 0;

describe('server', () => {
  it('should start', async () => {
    const { server, serverClosed } = await start(undefined, undefined);

    expect(server.listening).toBeTruthy();

    await request(server, '/close', 'POST');
    await serverClosed;
  });

  it('should accept a ws request', async t => {
    for (const worker of [await createWorker(workerPath), undefined]) {
      await t.test(worker ? 'with worker' : 'without worker', async () => {
        const fixtures = join(import.meta.dirname, 'fixtures', 'router');
        const filePath = toUnixPath(join(fixtures, 'file.ts'));

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
