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
import { setContext, toUnixPath } from 'helpers';
import http from 'http';
import { initializeLinter } from 'linting/eslint';
import path from 'path';
import { start } from 'server';
import { createProgram } from 'services/program';
import { promisify } from 'util';
import { request } from '../tools';
import * as fs from 'fs';

describe('router', () => {
  const port = 0;

  let server: http.Server;
  let close: () => Promise<void>;

  beforeEach(async () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
    jest.setTimeout(60 * 1000);
    server = await start(port, '127.0.0.1', 60 * 60 * 1000);
    close = promisify(server.close.bind(server));
  });

  afterEach(async () => {
    await close();
  });

  it('should route /analyze-css requests', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'file.css');
    const rules = [{ key: 'function-calc-no-invalid', configurations: [] }];
    const data = { filePath, rules };
    const response = (await request(server, '/analyze-css', 'POST', data)) as string;
    expect(JSON.parse(response)).toEqual({
      issues: [
        {
          ruleId: 'function-calc-no-invalid',
          line: 1,
          column: 6,
          message: `Fix this malformed 'calc' expression.`,
        },
      ],
    });
  });

  it('should route /analyze-js requests', async () => {
    initializeLinter([
      { key: 'prefer-regex-literals', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const filePath = path.join(__dirname, 'fixtures', 'file.js');
    const fileType = 'MAIN';
    const data = { filePath, fileType, tsConfigs: [] };
    const response = (await request(server, '/analyze-js', 'POST', data)) as string;
    const {
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'prefer-regex-literals',
        line: 1,
        column: 0,
        endLine: 1,
        endColumn: 17,
        message: `Use a regular expression literal instead of the 'RegExp' constructor.`,
      }),
    );
  });

  it('should route /analyze-ts requests', async () => {
    initializeLinter([
      { key: 'no-duplicate-in-composite', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const filePath = path.join(__dirname, 'fixtures', 'file.ts');
    const fileType = 'MAIN';
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.json');
    const data = { filePath, fileType, tsConfigs: [tsConfig] };
    const response = (await request(server, '/analyze-ts', 'POST', data)) as string;
    const {
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-duplicate-in-composite',
        line: 1,
        column: 28,
        endLine: 1,
        endColumn: 35,
        message: `Remove this duplicated type or replace with another one.`,
      }),
    );
  });

  it('should route /analyze-with-program requests', async () => {
    initializeLinter([
      { key: 'no-duplicate-in-composite', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const filePath = path.join(__dirname, 'fixtures', 'file.ts');
    const fileType = 'MAIN';
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.json');
    const { programId } = await createProgram(tsConfig);
    const data = { filePath, fileType, programId };
    const response = (await request(server, '/analyze-with-program', 'POST', data)) as string;
    const {
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-duplicate-in-composite',
        line: 1,
        column: 28,
        endLine: 1,
        endColumn: 35,
        message: `Remove this duplicated type or replace with another one.`,
      }),
    );
  });

  it('should route /analyze-yaml requests', async () => {
    initializeLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const filePath = path.join(__dirname, 'fixtures', 'file.yaml');
    const data = { filePath };
    const response = (await request(server, '/analyze-yaml', 'POST', data)) as string;
    const {
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual({
      ruleId: 'no-all-duplicated-branches',
      line: 8,
      column: 17,
      endLine: 8,
      endColumn: 46,
      message:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      quickFixes: [],
      secondaryLocations: [],
    });
  });

  it('should route /analyze-html requests', async () => {
    initializeLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const filePath = path.join(__dirname, 'fixtures', 'file.html');
    const data = { filePath };
    const response = (await request(server, '/analyze-html', 'POST', data)) as string;
    const {
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual({
      ruleId: 'no-all-duplicated-branches',
      line: 10,
      column: 2,
      endLine: 10,
      endColumn: 31,
      message:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      quickFixes: [],
      secondaryLocations: [],
    });
  });

  it('should route /create-program requests', async () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.json');
    const data = { tsConfig };
    const response = (await request(server, '/create-program', 'POST', data)) as string;
    const programId = Number(JSON.parse(response).programId);
    expect(programId).toBeDefined();
    expect(programId).toBeGreaterThan(0);
  });

  it('should forward /create-program failures', async () => {
    console.error = jest.fn();
    const tsConfig = path.join(__dirname, 'fixtures', 'malformed.json');
    const data = { tsConfig };
    const response = (await request(server, '/create-program', 'POST', data)) as string;
    const { error } = JSON.parse(response);
    expect(error).toBeDefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('should route /delete-program requests', async () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.json');
    const { programId } = await createProgram(tsConfig);
    const data = { programId };
    const response = (await request(server, '/delete-program', 'POST', data)) as string;
    expect(response).toEqual('OK!');
  });

  it('should route /init-linter requests', async () => {
    const data = { rules: [], environments: [], globals: [] };
    const response = await request(server, '/init-linter', 'POST', data);
    expect(response).toEqual('OK!');
  });

  it('should route /new-tsconfig requests', async () => {
    /**
     * There is no easy way to test that a module was unloaded, because jest is modifying require calls for tests
     * @see https://github.com/facebook/jest/issues/6725
     */
    const data = {};
    const response = await request(server, '/new-tsconfig', 'POST', data);
    expect(response).toEqual('OK!');
  });

  it('should route /status requests', async () => {
    const response = await request(server, '/status', 'GET');
    expect(response).toEqual('OK!');
  });

  it('should route /tsconfig-files requests', async () => {
    const tsconfig = path.join(__dirname, 'fixtures', 'tsconfig.json');
    const data = { tsconfig };
    const response = (await request(server, '/tsconfig-files', 'POST', data)) as string;
    expect(JSON.parse(response)).toEqual({
      files: [toUnixPath(path.join(__dirname, 'fixtures', 'file.ts'))],
      projectReferences: [],
    });
  });

  it('should forward /tsconfig-files failures', async () => {
    console.error = jest.fn();
    const tsConfig = path.join(__dirname, 'fixtures', 'malformed.json');
    const data = { tsConfig };
    const response = (await request(server, '/tsconfig-files', 'POST', data)) as string;
    const { error } = JSON.parse(response);
    expect(error).toEqual('Debug Failure.');
    expect(console.error).toHaveBeenCalled();
  });

  it('should write tsconfig.json file', async () => {
    const response = (await request(server, '/create-tsconfig-file', 'POST', {
      include: ['/path/to/project/**/*'],
    })) as string;
    const json = JSON.parse(response);
    expect(json).toBeTruthy();
    expect(json.filename).toBeTruthy();
    expect(fs.existsSync(json.filename)).toBe(true);
  });
});
