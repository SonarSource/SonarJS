/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { start } from '../src/server';
import { promisify } from 'util';
import path from 'path';
import { setContext } from '@sonar/shared/helpers';
import { AddressInfo } from 'net';
import { request } from './tools';
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
    expect.assertions(4);

    console.log = jest.fn();

    const server = await start(undefined, undefined);
    const close = promisify(server.close.bind(server));

    expect(server.listening).toBeTruthy();
    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenNthCalledWith(1, 'DEBUG Starting the bridge server');
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      `DEBUG The bridge server is listening on port ${(server.address() as AddressInfo)?.port}`,
    );

    await close();
  });

  it('should fail when linter is not initialized', async () => {
    expect.assertions(3);

    const server = await start(port);
    const close = promisify(server.close.bind(server));

    const ruleId = 'no-extra-semi';
    const fileType = 'MAIN';

    expect(JSON.parse(await requestAnalyzeJs(server, fileType))).toStrictEqual({
      parsingError: {
        code: 'LINTER_INITIALIZATION',
        message: 'Linter default does not exist. Did you call /init-linter?',
      },
    });

    expect(await requestInitLinter(server, fileType, ruleId)).toBe('OK!');

    const {
      issues: [issue],
    } = JSON.parse(await requestAnalyzeJs(server, fileType));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId,
      }),
    );

    await close();
  });

  it('should route service requests', async () => {
    expect.assertions(2);

    const server = await start(port);
    const close = promisify(server.close.bind(server));

    expect(server.listening).toBeTruthy();

    const ruleId = 'no-extra-semi';
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

    await close();
  });

  it('should shut down', async () => {
    expect.assertions(2);

    console.log = jest.fn();

    const server = await start(port);

    const closeRequest = request(server, '/close', 'POST');
    await closeRequest;

    expect(server.listening).toBeFalsy();
    expect(console.log).toHaveBeenCalledWith('DEBUG Shutting down the bridge server');
  });

  it('should timeout', async () => {
    console.log = jest.fn();

    const server = await start(port, '127.0.0.1', 500);

    await new Promise(r => setTimeout(r, 100));
    expect(server.listening).toBeTruthy();
    await request(server, '/status', 'GET');

    await new Promise(r => setTimeout(r, 100));
    expect(server.listening).toBeTruthy();
    await request(server, '/status', 'GET');

    await new Promise(r => setTimeout(r, 600));
    expect(server.listening).toBeFalsy();

    expect(console.log).toHaveBeenCalledWith('DEBUG The bridge server shutted down');
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
