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
import * as http from 'http';
import path from 'path';
import * as fs from 'fs';
import { request } from '../tests/tools';

const server = {
  // must be the same as the one used in ./server.js
  address: () => {
    return { port: 64829 };
  },
};

const start = Date.now();

try {
  const ruleId = extractRuleFromArgs();
  const { js: jsProjects, ts: tsProjects } = extractScopeFromArgs() as any;
  const parallelism = extractParallelismFromArgs();

  (async () => {
    await requestInitLinter(server as http.Server, 'MAIN', ruleId);

    if (jsProjects !== undefined) {
      for (let i = 0; i < jsProjects.length; i++) {
        await analyzeJSProject(server as http.Server, jsProjects[i], parallelism);
      }
    }
    if (tsProjects !== undefined) {
      for (let i = 0; i < tsProjects.length; i++) {
        await analyzeTsProject(server as http.Server, tsProjects[i], parallelism);
      }
    }
  })();
} catch (e) {
  console.error(`Profiling exited because of Error: ${e.message}`);
} finally {
  const timeSeconds = (Date.now() - start) / 1000;
  console.log(`done in ${timeSeconds}s`);
}

function extractRuleFromArgs() {
  if (process.argv.length <= 2) {
    throw new Error('Missing rule id. Please provide a rule id as CLI argument');
  }
  return process.argv[2];
}

function extractScopeFromArgs() {
  const SCOPES = ['js', 'ts', 'all'];
  const JS_PROJECTS = {
    js: [
      'amplify/src',
      'angular.js/src',
      'backbone',
      'es5-shim',
      'file-for-rules',
      'fireact/src',
      'javascript-test-sources/src',
      'jira-clone',
      'jquery/src',
      'jshint/src',
      'jStorage',
      'knockout/src',
      'mootools-core/Source',
      'ocanvas/src',
      'p5.js/src',
      'paper.js/src',
      'prototype/src',
      'qunit/src',
      'react-cloud-music/src',
      'sizzle/src',
      'underscore',
    ],
  };
  JS_PROJECTS.js = JS_PROJECTS.js.map(filePath =>
    path.join(__dirname, '../../its/sources/', filePath),
  );
  const TS_PROJECTS = {
    ts: [
      'ag-grid/tsconfig.json',
      'ant-design/tsconfig.json',
      'console/tsconfig.json',
      // there are other folders in courselit
      'courselit/apps/web/tsconfig.json',
      'desktop/tsconfig.json',
      'eigen/tsconfig.json',
      'fireface/src/tsconfig.json',
      'ionic2-auth/tsconfig.json',
      'Joust/tsconfig.json',
      // other folders as well here
      'moose/main/tsconfig.json',
      'postgraphql/tsconfig.json',
      'prettier-vscode/tsconfig.json',
      'rxjs/tsconfig.json',
      // other folders as well
      'searchkit/packages/searchkit-cli/tsconfig.json',
      // other folders as well
      'TypeScript/src/compiler/tsconfig.json',
    ],
  };
  TS_PROJECTS.ts = TS_PROJECTS.ts.map(filePath =>
    path.join(__dirname, '../../its/typescript-test-sources/src/', filePath),
  );

  if (process.argv.length < 4) {
    return JS_PROJECTS;
  }
  const scope = process.argv[3];
  if (!SCOPES.includes(scope)) {
    throw new Error(
      `Unknown scope. Please provide one of the available: ${SCOPES.map(scope => `"${scope}"`)}`,
    );
  }
  switch (scope) {
    case 'js':
      return { ...JS_PROJECTS, ts: undefined };
    case 'ts':
      return { js: undefined, ...TS_PROJECTS };
    case 'all':
      return { ...JS_PROJECTS, ...TS_PROJECTS };
  }
}

function extractParallelismFromArgs() {
  let parallelism = 5;
  if (process.argv.length < 5) {
    return parallelism;
  }
  parallelism = parseInt(process.argv[4]);
  if (isNaN(parallelism) || parallelism < 1) {
    throw new Error(
      `Invalid parallelism parameter at 3rd position "${process.argv[4]}". Please prove a positive number.`,
    );
  }
  return parallelism;
}

function requestInitLinter(server: http.Server, fileType: string, ruleId: string) {
  const config = {
    rules: [{ key: ruleId, configurations: [], fileTypeTarget: fileType }],
  };
  return request(server, '/init-linter', 'POST', config);
}

async function analyzeTsProject(server: http.Server, tsConfigPath: string, parallelism) {
  console.log('####################################');
  console.log(`Analyzing TS project ${tsConfigPath}`);
  console.log('####################################');

  const { programId, files } = await createProgram(server, tsConfigPath);
  console.log(`Created program with programId ${programId} containing ${files.length} files`);
  const promises: (() => Promise<any>)[] = buildPromises(server, programId, files);
  await executePromises(promises, parallelism, files, tsConfigPath);
  await deleteProgram(server, programId);

  async function createProgram(server: http.Server, tsConfigPath: string): Promise<any> {
    try {
      const response = await request(server, '/create-program', 'POST', { tsConfig: tsConfigPath });
      return JSON.parse(response as string);
    } catch (e) {
      console.error(`Error while creating program for ${tsConfigPath}. Error: ${e.message}`);
    }
  }

  async function deleteProgram(server: http.Server, programId: string) {
    try {
      await request(server, '/delete-program', 'POST', { programId });
    } catch (e) {
      console.error(
        `Error while deleting program with programId: ${programId}. Error: ${e.message}`,
      );
    }
  }

  function buildPromises(server: http.Server, tsConfigId: string, files: string[]) {
    const promises: (() => Promise<any>)[] = [];
    for (const file of files) {
      promises.push(() => analyzeFile(server, tsConfigId, file));
    }
    return promises;

    async function analyzeFile(
      server: http.Server,
      programId: string,
      filePath: string,
    ): Promise<unknown> {
      return request(server, '/analyze-ts', 'POST', { programId, filePath });
    }
  }
}

async function analyzeJSProject(server: http.Server, projectPath: string, parallelism: number) {
  console.log('####################################');
  console.log(`Analyzing JS project ${projectPath}`);
  console.log('####################################');

  let files: string[] = [];
  collectFilesInFolder(projectPath, files);
  console.log(`Found ${files.length} files`);
  files = files.filter(isJSFile);
  console.log(`of which ${files.length} are JS files`);
  const promises = buildPromises(server, files);
  await executePromises(promises, parallelism, files, projectPath);

  function isJSFile(filePath: string) {
    return filePath.endsWith('.js');
  }

  function buildPromises(server: http.Server, files: string[]) {
    const promises: (() => Promise<any>)[] = [];
    files.forEach(filePath => {
      promises.push(() => analyzeFile(server, filePath));
    });
    return promises;

    async function analyzeFile(server: http.Server, filePath: string) {
      const response = await request(server, '/analyze-js', 'POST', {
        filePath,
        fileType: 'MAIN',
        linterId: 'default',
      });
      return response;
    }
  }
}

function collectFilesInFolder(folder: string, files: string[]) {
  fs.readdirSync(folder).forEach(file => {
    const filePath = path.join(folder, file);
    if (fs.statSync(filePath).isDirectory()) {
      return collectFilesInFolder(filePath, files);
    } else {
      return files.push(filePath);
    }
  });
}

async function executePromises(
  promises: (() => Promise<any>)[],
  parallelism: number,
  files: string[],
  projectPath: string,
) {
  for (let i = 0; i < promises.length; i += parallelism) {
    const endIndex = Math.min(i + parallelism - 1, promises.length - 1);
    try {
      console.log(
        `Analysing files from ${i + 1} to ${endIndex + 1} (out of ${
          promises.length
        }) for ${projectPath}`,
      );
      await Promise.all(promises.slice(i, endIndex + 1).map(fn => fn()));
    } catch (e) {
      console.error(`Failed analyzing files: ${files.slice(i, endIndex + 1)}`);
    }
  }
}
