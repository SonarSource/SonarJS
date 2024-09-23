/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { start } from '../src/server.js';
import path from 'path';
import { setContext } from '@sonar/shared/index.js';
import { AddressInfo } from 'net';
import { request } from './tools/index.js';
import http from 'http';

describe('server', () => {
  const port = 0;

  beforeAll(() => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should start', async () => {
    expect.assertions(5);

    console.log = jest.fn();

    const { server, serverClosed } = await start(undefined, undefined);

    expect(server.listening).toBeTruthy();
    expect(console.log).toHaveBeenCalledTimes(3);
    expect(console.log).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching('Memory configuration: OS \\(\\d+ MB\\), Node.js \\(\\d+ MB\\).'),
    );
    expect(console.log).toHaveBeenNthCalledWith(2, `DEBUG Starting the bridge server`);
    expect(console.log).toHaveBeenNthCalledWith(
      3,
      `DEBUG The bridge server is listening on port ${(server.address() as AddressInfo)?.port}`,
    );

    await request(server, '/close', 'POST');
    await serverClosed;
  });

  it('should fail when linter is not initialized', async () => {
    expect.assertions(3);

    const { server, serverClosed } = await start(port);

    const ruleId = 'S1116';
    const fileType = 'MAIN';

    expect(JSON.parse(await requestAnalyzeJs(server, fileType))).toStrictEqual({
      parsingError: {
        code: 'LINTER_INITIALIZATION',
        message: 'Linter default does not exist. Did you call /init-linter?',
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
    expect.assertions(2);

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
    expect.assertions(3);

    console.log = jest.fn();

    const { server, serverClosed } = await start(port);
    expect(server.listening).toBeTruthy();

    await request(server, '/close', 'POST');

    expect(server.listening).toBeFalsy();
    expect(console.log).toHaveBeenCalledWith('DEBUG Shutting down the worker');
    await serverClosed;
  });

  it('worker crashing should close server', async () => {
    console.log = jest.fn();

    const { server, serverClosed, worker } = await start(port);
    expect(server.listening).toBeTruthy();

    worker.emit('error', new Error('An error'));
    await worker.terminate();

    expect(server.listening).toBeFalsy();
    expect(console.log).toHaveBeenCalledWith('DEBUG The worker thread failed: Error: An error');
    await serverClosed;
  });

  it('should timeout', async () => {
    console.log = jest.fn();

    const { server, serverClosed } = await start(port, '127.0.0.1', 500);

    await new Promise(r => setTimeout(r, 100));
    expect(server.listening).toBeTruthy();
    await request(server, '/status', 'GET');

    await new Promise(r => setTimeout(r, 100));
    expect(server.listening).toBeTruthy();
    await request(server, '/status', 'GET');

    await serverClosed;
    expect(console.log).toHaveBeenCalledWith('DEBUG The bridge server shut down');
    expect(server.listening).toBeFalsy();
  });
});

async function requestAnalyzeJs(server: http.Server, fileType: string): Promise<any> {
  const filePath = path.join(__dirname, 'fixtures', 'routing.js');
  const analysisInput = { filePath, fileType };

  return await request(server, '/analyze-js', 'POST', analysisInput);
}

function requestInitLinter(server: http.Server, fileType: string, ruleId: string) {
  const config = {
    rules: [{ key: ruleId, configurations: [], fileTypeTarget: fileType }],
  };

  return request(server, '/init-linter', 'POST', config);
}
