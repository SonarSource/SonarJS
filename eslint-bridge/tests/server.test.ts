/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { start } from 'server';
import { promisify } from 'util';
import path from 'path';
import { setContext } from 'helpers';
import { request } from './tools/helpers';

describe('server', () => {
  const host = '127.0.0.1';
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

    const server = await start(port, host);
    const close = promisify(server.close.bind(server));

    expect(server.listening).toBeTruthy();
    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenNthCalledWith(
      1,
      `DEBUG starting eslint-bridge server at port ${port}`,
    );
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      `DEBUG eslint-bridge server is running at port ${port}`,
    );

    await close();
  });

  it('should route service requests', async () => {
    expect.assertions(2);

    const server = await start(port, host);
    const close = promisify(server.close.bind(server));

    expect(server.listening).toBeTruthy();

    const ruleId = 'no-extra-semi';
    const fileType = 'MAIN';
    const config = {
      rules: [{ key: ruleId, configurations: [], fileTypeTarget: fileType }],
    };

    const initLinterRequest = request(server, '/init-linter', 'POST', config);
    await initLinterRequest;

    const filePath = path.join(__dirname, 'fixtures', 'routing.js');
    const analysisInput = { filePath, fileType };

    const analyzeJsRequest = request(server, '/analyze-js', 'POST', analysisInput);
    const response = (await analyzeJsRequest) as any;

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

  it('should close', async () => {
    expect.assertions(2);

    console.log = jest.fn();

    const server = await start(port, host);

    const closeRequest = request(server, '/close', 'POST');
    await closeRequest;

    expect(server.listening).toBeFalsy();
    expect(console.log).toHaveBeenCalledWith('DEBUG eslint-bridge server will shutdown');
  });
});
