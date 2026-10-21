/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// Exercise the packaged worker and retained in-process program across IDE requests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client, credentials } from '@grpc/grpc-js';
import protobuf from '../packages/grpc/src/proto/analyze-project.js';

const proto = protobuf.sonarjs.analyzeproject.v1;
const root = fileURLToPath(new URL('../', import.meta.url));
const server = spawn(process.execPath, ['bin/server.cjs', '0', '127.0.0.1', 'false'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stderr.on('data', chunk => {
  output += chunk;
});
let client: Client | undefined;
try {
  const address = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Bundle startup timed out: ${output}`)),
      30_000,
    );
    server.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Bundle exited ${code}: ${output}`));
    });
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = /gRPC analyze-project server listening on (127\.0\.0\.1:\d+)/.exec(output);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });
  client = new Client(address, credentials.createInsecure());
  async function requestAnalysis(request: InstanceType<typeof proto.AnalyzeProjectRequest>) {
    return await new Promise<InstanceType<typeof proto.AnalyzeProjectUnaryResponse>>(
      (resolve, reject) => {
        client!.makeUnaryRequest(
          '/sonarjs.analyzeproject.v1.AnalyzeProjectService/AnalyzeProjectUnary',
          request => Buffer.from(proto.AnalyzeProjectRequest.encode(request).finish()),
          buffer => proto.AnalyzeProjectUnaryResponse.decode(buffer),
          request,
          { deadline: Date.now() + 30_000 },
          (error, result) => (error ? reject(error) : resolve(result!)),
        );
      },
    );
  }
  const filePath = '/sonarjs/bundle-check/main.ts';
  async function analyze(fileContent: string) {
    const request = proto.AnalyzeProjectRequest.create({
      configuration: {
        baseDir: '/sonarjs/bundle-check',
        canAccessFileSystem: false,
        sonarlint: true,
      },
      files: { [filePath]: { fileType: proto.FileType.FILE_TYPE_MAIN, fileContent } },
      rules: ['S2871', 'S1116'].map(key => ({
        key,
        configurations: [],
        fileTypeTargets: [proto.FileType.FILE_TYPE_MAIN],
        language: proto.JsTsLanguage.JS_TS_LANGUAGE_TS,
        analysisModes: [proto.AnalysisMode.ANALYSIS_MODE_DEFAULT],
      })),
      bundles: [],
    });
    const response = await requestAnalysis(request);
    const result = response.files[filePath];
    assert.ok(result, `Missing file result: ${JSON.stringify(response)}`);
    assert.equal(result.error, null);
    assert.deepEqual(result.parsingErrors, []);
    assert.deepEqual(response.meta?.warnings, []);
    const typedIssue = result.issues.find(issue => issue.ruleId === 'S2871');
    if (typedIssue) assert.ok(typedIssue.quickFixes.some(fix => fix.edits.length > 0));
    return result.issues.map(issue => issue.ruleId).sort();
  }
  assert.deepEqual(await analyze('const values: number[] = [2, 1]; values.sort();;'), [
    'S1116',
    'S2871',
  ]);
  assert.deepEqual(
    await analyze('const values: number[] = [2, 1]; values.sort((a, b) => a - b);'),
    [],
  );
  for (const [project, config, source] of [
    ['typechecker-config/multiple-targets', 'tsconfig.es6.json', 'src/main.es6.ts'],
    ['typechecker-config/multiple-targets', 'tsconfig.json', 'src/main.ts'],
    ['websensor-multi-module', 'tsconfig.shared.json', 'moduleA/src/main.ts'],
    ['websensor-multi-module', 'tsconfig.moduleA.json', 'moduleA/src/main.ts'],
    ['websensor-multi-module', 'tsconfig.moduleB.json', 'moduleB/src/main.ts'],
  ]) {
    const baseDir = fileURLToPath(new URL(`../its/plugin/projects/${project}/`, import.meta.url));
    const response = await requestAnalysis(
      proto.AnalyzeProjectRequest.create({
        configuration: { baseDir, canAccessFileSystem: true, tsConfigPaths: [baseDir + config] },
        rules: [
          {
            key: 'S3003',
            configurations: [],
            fileTypeTargets: [proto.FileType.FILE_TYPE_MAIN],
            language: proto.JsTsLanguage.JS_TS_LANGUAGE_TS,
            analysisModes: [proto.AnalysisMode.ANALYSIS_MODE_DEFAULT],
          },
        ],
      }),
    );
    const result = response.files[baseDir + source];
    assert.ok(result, `Missing ${project}/${source}: ${JSON.stringify(response)}`);
    assert.equal(result.error, null);
    assert.deepEqual(result.parsingErrors, []);
    assert.equal(
      result.issues.filter(issue => issue.ruleId === 'S3003').length,
      1,
      `${project}/${config} must retain imported constant types`,
    );
  }
  console.log(
    'Packaged bridge: typed and syntax findings, fixes, successive IDE updates, and unchanged baseUrl QA projects passed.',
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  client?.close();
  server.kill();
}
