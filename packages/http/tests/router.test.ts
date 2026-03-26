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
import http from 'node:http';
import path from 'node:path';
import { start } from '../src/server.js';
import { request } from './tools/request.js';
import { describe, before, after, it } from 'node:test';
import { expect } from 'expect';

import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { createWorker } from '../src/worker/create-worker.js';

describe('router', () => {
  const fixtures = path.join(import.meta.dirname, 'fixtures', 'router');
  const port = 0;
  let closePromise: Promise<void>;
  const workerPath = path.join(import.meta.dirname, '..', '..', '..', 'server.mjs');

  let server: http.Server;

  before(async () => {
    const worker = await createWorker(workerPath);
    const { server: serverInstance, serverClosed } = await start(port, '127.0.0.1', worker);
    server = serverInstance;
    closePromise = serverClosed;
  });

  after(async () => {
    await request(server, '/close', 'POST');
    //We need to await the server close promise, as the http server still needs to be up to finish the response of the /close request.
    await closePromise;
  });

  it('should route /analyze-project requests', async () => {
    const filePath = normalizeToAbsolutePath(path.join(fixtures, 'file.ts'));
    const payload = {
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
    };

    const response = (await request(server, '/analyze-project', 'POST', payload)) as string;
    const {
      files: {
        [filePath]: {
          issues: [issue],
        },
      },
    } = JSON.parse(response);
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

  it('should route /status requests', async () => {
    const response = await request(server, '/status', 'GET');
    expect(response).toEqual('OK');
  });

  it('should route /on-cancel-analysis requests', async () => {
    const response = await request(server, '/cancel-analysis', 'POST');
    expect(response).toEqual('OK');
  });
});
