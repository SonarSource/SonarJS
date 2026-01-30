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
import { request } from './tools/index.js';
import { describe, before, after, it } from 'node:test';
import { expect } from 'expect';

import { rule as S5362 } from '../../css/src/rules/S5362/index.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { ProjectAnalysisInput } from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { deserializeProtobuf } from '../../jsts/src/parsers/ast.js';
import { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import { createWorker } from '../../shared/src/helpers/worker.js';

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
    const payload: ProjectAnalysisInput = {
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

  it('should route /analyze-css requests', async () => {
    const filePath = path.join(fixtures, 'file.css');
    const rules = [{ key: S5362.ruleName, configurations: [] }];
    const data = { filePath, rules };
    const response = (await request(server, '/analyze-css', 'POST', data)) as string;
    expect(JSON.parse(response)).toEqual({
      issues: [
        {
          ruleId: S5362.ruleName,
          line: 1,
          column: 6,
          message: `Fix this malformed 'calc' expression. (sonar/function-calc-no-invalid)`,
        },
      ],
    });
  });

  it('should route /analyze-jsts requests', async () => {
    await requestInitLinter(server, [
      {
        key: 'S6325',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
      {
        key: 'S4621',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'ts',
        analysisModes: ['DEFAULT'],
      },
    ]);
    let filePath = path.join(fixtures, 'file.js');
    let fileType = 'MAIN';
    let data: any = { filePath, fileType, tsConfigs: [] };
    let response = await request(server, '/analyze-jsts', 'POST', data);
    let {
      ast,
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S6325',
        line: 1,
        column: 0,
        endLine: 1,
        endColumn: 17,
        message: `Use a regular expression literal instead of the 'RegExp' constructor.`,
      }),
    );
    const protoMessage = deserializeProtobuf(ast);
    expect(protoMessage.type).toEqual(0);
    expect(protoMessage.program.body).toHaveLength(1);
    expect(protoMessage.program.body[0].expressionStatement.expression.newExpression).toBeDefined();

    filePath = path.join(fixtures, 'file.ts');
    fileType = 'MAIN';
    data = { filePath, fileType, tsConfigs: [path.join(fixtures, 'tsconfig.json')], skipAst: true };
    response = await request(server, '/analyze-jsts', 'POST', data);
    ({
      issues: [issue],
    } = JSON.parse(response));
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

  it('should route /analyze-yaml requests', async () => {
    await requestInitLinter(server, [
      {
        key: 'S3923',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const filePath = path.join(fixtures, 'file.yaml');
    const filePathWithLambda = path.join(fixtures, 'file-SomeLambdaFunction.yaml');
    const data = { filePath };
    const response = (await request(server, '/analyze-yaml', 'POST', data)) as string;
    const {
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual({
      ruleId: 'S3923',
      language: 'js',
      line: 8,
      column: 17,
      endLine: 8,
      endColumn: 46,
      message:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      quickFixes: [],
      secondaryLocations: [],
      ruleESLintKeys: ['no-all-duplicated-branches'],
      filePath: filePathWithLambda,
    });
  });

  it('should route /analyze-html requests', async () => {
    await requestInitLinter(server, [
      {
        key: 'S3923',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const filePath = path.join(fixtures, 'file.html');
    const data = { filePath };
    const response = (await request(server, '/analyze-html', 'POST', data)) as string;
    const {
      issues: [issue],
    } = JSON.parse(response);
    expect(issue).toEqual({
      ruleId: 'S3923',
      language: 'js',
      line: 10,
      column: 2,
      endLine: 10,
      endColumn: 31,
      message:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      quickFixes: [],
      secondaryLocations: [],
      ruleESLintKeys: ['no-all-duplicated-branches'],
      filePath,
    });
  });

  it('should route /init-linter requests', async () => {
    const data = { rules: [], environments: [], globals: [] };
    const response = await request(server, '/init-linter', 'POST', data);
    expect(response).toEqual('OK');
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

function requestInitLinter(server: http.Server, rules: RuleConfig[]) {
  const config = { rules };
  return request(server, '/init-linter', 'POST', config);
}
