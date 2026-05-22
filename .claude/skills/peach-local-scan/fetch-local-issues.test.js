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
import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchLocalIssues, main } from './fetch-local-issues.js';

const VIRTUAL_HOME = '/workspace/home';
const TOKEN_FILE = `${VIRTUAL_HOME}/.vibe-bot-credentials/.sonarqube/token`;
const OUTPUT_PATH = '/workspace/peach-local-scan/issues.json';
const REPORT_TASK_PATH = '/workspace/report-task.txt';

test('fetchLocalIssues paginates raised issues, trims token file content, and writes stable JSON', async () => {
  const output = {};
  const mkdirCalls = [];
  const fetchCalls = [];
  const logs = [];
  const authHeader = `Basic ${Buffer.from('local-token:').toString('base64')}`;

  await fetchLocalIssues(
    {
      projectKey: 'peach:alpha',
      outputPath: OUTPUT_PATH,
    },
    {
      homedir: () => VIRTUAL_HOME,
      readFileSync: filePath => {
        assert.equal(filePath, TOKEN_FILE);
        return 'local-token\r\n';
      },
      fetch: async (url, options = {}) => {
        const parsed = new URL(url);
        const page = Number(parsed.searchParams.get('p'));
        fetchCalls.push({
          url: parsed.toString(),
          authorization: options.headers?.Authorization,
        });

        assert.equal(parsed.origin, 'http://localhost:9000');
        assert.equal(parsed.pathname, '/api/issues/search');
        assert.equal(parsed.searchParams.get('projects'), 'peach:alpha');
        assert.equal(parsed.searchParams.get('resolved'), 'false');
        assert.equal(parsed.searchParams.get('ps'), '500');
        assert.equal(options.headers?.Authorization, authHeader);

        if (page === 1) {
          return {
            ok: true,
            json: async () => ({
              total: 3,
              issues: [
                {
                  key: 'B',
                  rule: 'javascript:S100',
                  severity: 'MAJOR',
                  component: 'peach:alpha:src/zeta.js',
                  project: 'peach:alpha',
                  line: 20,
                  message: 'second issue',
                  type: 'CODE_SMELL',
                  status: 'OPEN',
                },
                {
                  key: 'closed',
                  rule: 'javascript:S200',
                  severity: 'MINOR',
                  component: 'peach:alpha:src/closed.js',
                  project: 'peach:alpha',
                  line: 4,
                  message: 'should be filtered out',
                  type: 'BUG',
                  status: 'RESOLVED',
                  resolution: 'FIXED',
                },
              ],
            }),
          };
        }

        if (page === 2) {
          return {
            ok: true,
            json: async () => ({
              total: 3,
              issues: [
                {
                  key: 'A',
                  rule: 'javascript:S100',
                  severity: 'CRITICAL',
                  component: 'peach:alpha:src/alpha.js',
                  project: 'peach:alpha',
                  line: 3,
                  message: 'first issue',
                  type: 'BUG',
                  status: 'CONFIRMED',
                },
              ],
            }),
          };
        }

        throw new Error(`unexpected page ${page}`);
      },
      mkdirSync: (dirPath, options) => {
        mkdirCalls.push([dirPath, options]);
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      log: message => {
        logs.push(message);
      },
    },
  );

  assert.deepEqual(mkdirCalls, [['/workspace/peach-local-scan', { recursive: true }]]);
  assert.deepEqual(fetchCalls, [
    {
      url: 'http://localhost:9000/api/issues/search?projects=peach%3Aalpha&resolved=false&p=1&ps=500',
      authorization: authHeader,
    },
    {
      url: 'http://localhost:9000/api/issues/search?projects=peach%3Aalpha&resolved=false&p=2&ps=500',
      authorization: authHeader,
    },
  ]);

  const expectedArtifact = {
    projectKey: 'peach:alpha',
    total: 2,
    issues: [
      {
        key: 'A',
        rule: 'javascript:S100',
        severity: 'CRITICAL',
        component: 'peach:alpha:src/alpha.js',
        project: 'peach:alpha',
        line: 3,
        message: 'first issue',
        type: 'BUG',
        status: 'CONFIRMED',
      },
      {
        key: 'B',
        rule: 'javascript:S100',
        severity: 'MAJOR',
        component: 'peach:alpha:src/zeta.js',
        project: 'peach:alpha',
        line: 20,
        message: 'second issue',
        type: 'CODE_SMELL',
        status: 'OPEN',
      },
    ],
  };

  assert.equal(output[OUTPUT_PATH], `${JSON.stringify(expectedArtifact, null, 2)}\n`);
  assert.deepEqual(logs, [`Fetched 2 raised issues for peach:alpha into ${OUTPUT_PATH}`]);
});

test('fetchLocalIssues waits for CE completion before querying issues when report-task metadata is provided', async () => {
  const output = {};
  const fetchCalls = [];
  const logs = [];
  const sleepCalls = [];
  const authHeader = `Basic ${Buffer.from('local-token:').toString('base64')}`;

  await fetchLocalIssues(
    {
      projectKey: 'peach:beta',
      outputPath: OUTPUT_PATH,
      reportTaskPath: REPORT_TASK_PATH,
      cePollIntervalMs: 1,
      ceTimeoutMs: 50,
    },
    {
      homedir: () => VIRTUAL_HOME,
      readFileSync: (filePath, encoding) => {
        assert.equal(encoding, 'utf-8');
        if (filePath === TOKEN_FILE) {
          return 'local-token\r\n';
        }
        if (filePath === REPORT_TASK_PATH) {
          return 'projectKey=peach:beta\nceTaskId=task-123\nceTaskUrl=http://localhost:9000/api/ce/task?id=task-123\n';
        }
        throw new Error(`unexpected read ${filePath}`);
      },
      fetch: async (url, options = {}) => {
        const parsed = new URL(url);
        fetchCalls.push(parsed.toString());
        assert.equal(options.headers?.Authorization, authHeader);

        if (parsed.pathname === '/api/ce/task') {
          const cePollCount = fetchCalls.filter(call => call.includes('/api/ce/task')).length;
          return {
            ok: true,
            json: async () => ({
              task: {
                id: 'task-123',
                status: cePollCount === 1 ? 'IN_PROGRESS' : 'SUCCESS',
              },
            }),
          };
        }

        assert.equal(parsed.pathname, '/api/issues/search');
        assert.equal(parsed.searchParams.get('projects'), 'peach:beta');
        assert.equal(parsed.searchParams.get('resolved'), 'false');
        assert.equal(parsed.searchParams.get('p'), '1');
        assert.equal(parsed.searchParams.get('ps'), '500');

        return {
          ok: true,
          json: async () => ({
            total: 1,
            issues: [
              {
                key: 'beta-1',
                rule: 'javascript:S111',
                severity: 'MAJOR',
                component: 'peach:beta:src/index.js',
                project: 'peach:beta',
                line: 8,
                message: 'beta issue',
                type: 'CODE_SMELL',
                status: 'OPEN',
              },
            ],
          }),
        };
      },
      mkdirSync: () => {},
      sleep: async ms => {
        sleepCalls.push(ms);
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      log: message => {
        logs.push(message);
      },
    },
  );

  assert.deepEqual(fetchCalls, [
    'http://localhost:9000/api/ce/task?id=task-123',
    'http://localhost:9000/api/ce/task?id=task-123',
    'http://localhost:9000/api/issues/search?projects=peach%3Abeta&resolved=false&p=1&ps=500',
  ]);
  assert.deepEqual(sleepCalls, [1]);
  assert.deepEqual(logs, [
    'CE task task-123 status: IN_PROGRESS',
    'CE task task-123 status: SUCCESS',
    `Fetched 1 raised issues for peach:beta into ${OUTPUT_PATH}`,
  ]);

  const expectedArtifact = {
    projectKey: 'peach:beta',
    total: 1,
    issues: [
      {
        key: 'beta-1',
        rule: 'javascript:S111',
        severity: 'MAJOR',
        component: 'peach:beta:src/index.js',
        project: 'peach:beta',
        line: 8,
        message: 'beta issue',
        type: 'CODE_SMELL',
        status: 'OPEN',
      },
    ],
  };

  assert.equal(output[OUTPUT_PATH], `${JSON.stringify(expectedArtifact, null, 2)}\n`);
});

test('fetchLocalIssues partitions oversized issue searches using the workspace tree when needed', async () => {
  const output = {};
  const fetchCalls = [];
  const logs = [];
  const largeReportTaskPath = '/workspace/project/.scannerwork/report-task.txt';
  const directoryEntry = name => ({
    name,
    isDirectory: () => true,
    isFile: () => false,
  });

  await fetchLocalIssues(
    {
      projectKey: 'peach:gamma',
      outputPath: OUTPUT_PATH,
      pageSize: 10000,
      reportTaskPath: largeReportTaskPath,
    },
    {
      homedir: () => VIRTUAL_HOME,
      readFileSync: (filePath, encoding) => {
        assert.equal(encoding, 'utf-8');
        if (filePath === TOKEN_FILE) {
          return 'local-token\n';
        }
        if (filePath === largeReportTaskPath) {
          return 'projectKey=peach:gamma\nceTaskId=task-gamma\nceTaskUrl=http://localhost:9000/api/ce/task?id=task-gamma\n';
        }
        throw new Error(`unexpected read ${filePath}`);
      },
      fetch: async url => {
        const parsed = new URL(url);
        const request = {
          directories: parsed.searchParams.get('directories'),
          facets: parsed.searchParams.get('facets'),
          files: parsed.searchParams.get('files'),
          page: Number(parsed.searchParams.get('p')),
          pageSize: Number(parsed.searchParams.get('ps')),
          projects: parsed.searchParams.get('projects'),
          resolved: parsed.searchParams.get('resolved'),
          rules: parsed.searchParams.get('rules'),
        };
        fetchCalls.push(request);

        if (parsed.pathname === '/api/ce/task') {
          return {
            ok: true,
            json: async () => ({
              task: {
                id: 'task-gamma',
                status: 'SUCCESS',
              },
            }),
          };
        }

        assert.equal(request.projects, 'peach:gamma');
        assert.equal(request.resolved, 'false');

        if (!request.facets && !request.rules && request.page === 1) {
          return {
            ok: true,
            json: async () => ({
              total: 10002,
              issues: [
                {
                  key: 'root-sample',
                  rule: 'rule:A',
                  severity: 'MAJOR',
                  component: 'peach:gamma:src/root.js',
                  project: 'peach:gamma',
                  line: 1,
                  message: 'root sample',
                  type: 'CODE_SMELL',
                  status: 'OPEN',
                },
              ],
            }),
          };
        }

        if (request.facets === 'rules') {
          return {
            ok: true,
            json: async () => ({
              total: 10002,
              issues: [],
              facets: [
                {
                  property: 'rules',
                  values: [
                    { val: 'rule:A', count: 10001 },
                    { val: 'rule:B', count: 1 },
                  ],
                },
              ],
            }),
          };
        }

        if (!request.facets && request.rules === 'rule:B' && request.page === 1) {
          return {
            ok: true,
            json: async () => ({
              total: 1,
              issues: [
                {
                  key: 'issue-b',
                  rule: 'rule:B',
                  severity: 'MINOR',
                  component: 'peach:gamma:src/b.js',
                  project: 'peach:gamma',
                  line: 7,
                  message: 'rule b issue',
                  type: 'BUG',
                  status: 'OPEN',
                },
              ],
            }),
          };
        }

        if (!request.facets && request.rules === 'rule:A' && !request.directories && request.page === 1) {
          return {
            ok: true,
            json: async () => ({
              total: 10001,
              issues: [
                {
                  key: 'rule-a-sample',
                  rule: 'rule:A',
                  severity: 'MAJOR',
                  component: 'peach:gamma:src/root.js',
                  project: 'peach:gamma',
                  line: 2,
                  message: 'rule a sample',
                  type: 'CODE_SMELL',
                  status: 'OPEN',
                },
              ],
            }),
          };
        }

        if (request.facets === 'severities' && request.rules === 'rule:A') {
          return {
            ok: true,
            json: async () => ({
              total: 10001,
              issues: [],
              facets: [
                {
                  property: 'severities',
                  values: [{ val: 'MAJOR', count: 10001 }],
                },
              ],
            }),
          };
        }

        if (request.facets === 'types' && request.rules === 'rule:A') {
          return {
            ok: true,
            json: async () => ({
              total: 10001,
              issues: [],
              facets: [
                {
                  property: 'types',
                  values: [{ val: 'BUG', count: 10001 }],
                },
              ],
            }),
          };
        }

        if (!request.facets && request.rules === 'rule:A' && request.directories === 'src' && request.page === 1) {
          return {
            ok: true,
            json: async () => ({
              total: 10001,
              issues: [],
            }),
          };
        }

        if (!request.facets && request.rules === 'rule:A' && request.directories === 'src/dir-one') {
          return {
            ok: true,
            json: async () => ({
              total: 2,
              issues: [
                {
                  key: 'issue-a2',
                  rule: 'rule:A',
                  severity: 'CRITICAL',
                  component: 'peach:gamma:src/dir-one/zeta.js',
                  project: 'peach:gamma',
                  line: 12,
                  message: 'zeta issue',
                  type: 'BUG',
                  status: 'OPEN',
                },
                {
                  key: 'issue-a1',
                  rule: 'rule:A',
                  severity: 'MAJOR',
                  component: 'peach:gamma:src/dir-one/alpha.js',
                  project: 'peach:gamma',
                  line: 4,
                  message: 'alpha issue',
                  type: 'CODE_SMELL',
                  status: 'OPEN',
                },
              ],
            }),
          };
        }

        if (!request.facets && request.rules === 'rule:A' && request.directories === 'src/dir-two') {
          return {
            ok: true,
            json: async () => ({
              total: 1,
              issues: [
                {
                  key: 'issue-a3',
                  rule: 'rule:A',
                  severity: 'MAJOR',
                  component: 'peach:gamma:src/dir-two/beta.js',
                  project: 'peach:gamma',
                  line: 2,
                  message: 'beta issue',
                  type: 'CODE_SMELL',
                  status: 'OPEN',
                },
              ],
            }),
          };
        }

        throw new Error(`unexpected request: ${parsed.toString()}`);
      },
      mkdirSync: () => {},
      readdirSync: directoryPath => {
        if (directoryPath === '/workspace') {
          return [directoryEntry('project')];
        }
        if (directoryPath === '/workspace/project') {
          return [directoryEntry('src')];
        }
        if (directoryPath === '/workspace/project/src') {
          return [directoryEntry('dir-one'), directoryEntry('dir-two')];
        }
        throw new Error(`unexpected readdir ${directoryPath}`);
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      log: message => {
        logs.push(message);
      },
    },
  );

  assert.ok(fetchCalls.some(call => call.facets === 'rules'));
  assert.ok(fetchCalls.some(call => call.directories === 'src'));
  assert.ok(fetchCalls.some(call => call.directories === 'src/dir-one'));

  const expectedArtifact = {
    projectKey: 'peach:gamma',
    total: 4,
    issues: [
      {
        key: 'issue-b',
        rule: 'rule:B',
        severity: 'MINOR',
        component: 'peach:gamma:src/b.js',
        project: 'peach:gamma',
        line: 7,
        message: 'rule b issue',
        type: 'BUG',
        status: 'OPEN',
      },
      {
        key: 'issue-a1',
        rule: 'rule:A',
        severity: 'MAJOR',
        component: 'peach:gamma:src/dir-one/alpha.js',
        project: 'peach:gamma',
        line: 4,
        message: 'alpha issue',
        type: 'CODE_SMELL',
        status: 'OPEN',
      },
      {
        key: 'issue-a2',
        rule: 'rule:A',
        severity: 'CRITICAL',
        component: 'peach:gamma:src/dir-one/zeta.js',
        project: 'peach:gamma',
        line: 12,
        message: 'zeta issue',
        type: 'BUG',
        status: 'OPEN',
      },
      {
        key: 'issue-a3',
        rule: 'rule:A',
        severity: 'MAJOR',
        component: 'peach:gamma:src/dir-two/beta.js',
        project: 'peach:gamma',
        line: 2,
        message: 'beta issue',
        type: 'CODE_SMELL',
        status: 'OPEN',
      },
    ],
  };

  assert.equal(output[OUTPUT_PATH], `${JSON.stringify(expectedArtifact, null, 2)}\n`);
  assert.deepEqual(logs, [
    'CE task task-gamma status: SUCCESS',
    `Fetched 4 raised issues for peach:gamma into ${OUTPUT_PATH}`,
  ]);
});

test('main prints usage for --help', async () => {
  const logs = [];

  await main(['--help'], {
    log: message => {
      logs.push(message);
    },
  });

  assert.deepEqual(logs, [
    'Usage: node .claude/skills/peach-local-scan/fetch-local-issues.js <project-key> <output-path> [report-task-path]',
  ]);
});
