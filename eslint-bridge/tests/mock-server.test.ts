/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import * as http from 'http';
import { AddressInfo } from 'net';
import { promisify } from 'util';
import { join } from 'path';
import * as stylelint from 'stylelint';
import { ParseExceptionCode } from '../src/parser';

jest.mock('stylelint');

describe('mock server', () => {
  const filePath = join(__dirname, 'fixtures', 'css', 'file.css');

  const request = JSON.stringify({
    filePath,
    stylelintConfig: join(__dirname, 'fixtures', 'css', 'stylelintconfig.json'),
  });

  let server: http.Server;
  let close: () => Promise<void>;
  const logSpy = jest.fn();

  beforeAll(async () => {
    console.log = logSpy;
    server = await start();
    close = promisify(server.close.bind(server));
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await close();
  });

  it('should not return issues for not original file', async () => {
    (stylelint.lint as any).mockResolvedValue({
      results: [{ source: 'foo.bar' }],
    });
    const response = await postToServer(request, '/analyze-css', server);
    expect(JSON.parse(response)).toEqual({ issues: [] });
    expect(logSpy).toHaveBeenCalledWith(
      `DEBUG For file [${filePath}] received issues with [foo.bar] as a source. They will not be reported.`,
    );
  });

  it('should not return issues when failed promise returned', async () => {
    (stylelint.lint as any).mockRejectedValue(new Error('some reason'));
    const response = await postToServer(request, '/analyze-css', server);
    expect(JSON.parse(response).parsingError).toEqual({
      message: 'some reason',
      code: ParseExceptionCode.GeneralError,
    });
  });
});

function postToServer(data, endpoint, server: http.Server): Promise<string> {
  const options = {
    host: 'localhost',
    port: (<AddressInfo>server.address()).port,
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    let response = '';

    const req = http.request(options, res => {
      res.on('data', chunk => {
        response += chunk;
      });

      res.on('end', () => resolve(response));
    });

    req.on('error', reject);

    req.write(data);
    req.end();
  });
}
