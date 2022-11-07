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

const ruleId = extractRuleFromArgs();
const { js: jsProjects } = extractScopeFromArgs();

(async () => {
  await requestInitLinter(server as http.Server, 'MAIN', ruleId);

  if (jsProjects !== undefined) {
    for (let i = 0; i < jsProjects.length; i++) {
      await analyzeProject(server as http.Server, jsProjects[i]);
    }
  }

  console.log('done');
})();

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
      path.join(__dirname, '../../its/sources/amplify/src'),
      path.join(__dirname, '../../its/sources/angular.js/src'),
      path.join(__dirname, '../../its/sources/backbone'),
      path.join(__dirname, '../../its/sources/es5-shim'),
      path.join(__dirname, '../../its/sources/file-for-rules'),
      path.join(__dirname, '../../its/sources/fireact/src'),
      path.join(__dirname, '../../its/sources/javascript-test-sources/src'),
      path.join(__dirname, '../../its/sources/jira-clone'),
      path.join(__dirname, '../../its/sources/jquery/src'),
      path.join(__dirname, '../../its/sources/jshint/src'),
      path.join(__dirname, '../../its/sources/jStorage'),
      path.join(__dirname, '../../its/sources/knockout/src'),
      path.join(__dirname, '../../its/sources/mootools-core/Source'),
      path.join(__dirname, '../../its/sources/ocanvas/src'),
      path.join(__dirname, '../../its/sources/p5.js/src'),
      path.join(__dirname, '../../its/sources/paper.js/src'),
      path.join(__dirname, '../../its/sources/prototype/src'),
      path.join(__dirname, '../../its/sources/qunit/src'),
      path.join(__dirname, '../../its/sources/react-cloud-music/src'),
      path.join(__dirname, '../../its/sources/sizzle/src'),
      path.join(__dirname, '../../its/sources/underscore'),
    ],
  };
  const TS_PROJECTS = {
    ts: [
      path.join(__dirname, '../../its/typescript-test-sources/ag-grid/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/ant-design/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/console/tsconfig.json'),
      // there are other folders in courselit
      path.join(__dirname, '../../its/typescript-test-sources/courselit/apps/web/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/desktop/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/eigen/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/fireface/src/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/ionic2-auth/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/Joust/tsconfig.json'),
      // other folders as well here
      path.join(__dirname, '../../its/typescript-test-sources/moose/main/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/postgraphql/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/prettier-vscode/tsconfig.json'),
      path.join(__dirname, '../../its/typescript-test-sources/rxjs/tsconfig.json'),
      // other folders as well
      path.join(
        __dirname,
        '../../its/typescript-test-sources/searchkit/packages/searchkit-cli/tsconfig.json',
      ),
      // other folders as well
      path.join(
        __dirname,
        '../../its/typescript-test-sources/TypeScript/src/compiler/tsconfig.json',
      ),
    ],
  };

  if (process.argv.length < 4) {
    return JS_PROJECTS;
  }
  const scope = process.argv[3];
  if (!SCOPES.includes(scope)) {
    throw new Error(`unknown scope. Provide one of the available: ${SCOPES}`);
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

function requestInitLinter(server: http.Server, fileType: string, ruleId: string) {
  const config = {
    rules: [{ key: ruleId, configurations: [], fileTypeTarget: fileType }],
  };
  return request(server, '/init-linter', 'POST', config);
}

async function analyzeProject(server: http.Server, projectPath: string) {
  console.log('####################################');
  console.log(`# analyzing ${projectPath} #`);
  console.log('####################################');

  let files: string[] = [];
  collectFilesInFolder(projectPath, files);
  console.log(`Found ${files.length} files`);
  files = files.filter(isJSFile);
  console.log(`of which ${files.length} are JS files`);
  const promises = buildPromises(server, files);
  await executePromises(promises, 5);

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

  function isJSFile(filePath: string) {
    return filePath.endsWith('.js');
  }

  function buildPromises(server: http.Server, files: string[]) {
    const promises: Promise<unknown>[] = [];
    files.forEach(filePath => {
      promises.push(analyzeFile(server, filePath));
    });
    return promises;

    async function analyzeFile(server: http.Server, filePath: string) {
      const response = await request(server as http.Server, '/analyze-js', 'POST', {
        filePath,
        fileType: 'MAIN',
        linterId: 'default',
      });
      return response;
    }
  }

  async function executePromises(promises: Promise<unknown>[], parallelism: number) {
    for (let i = 0; i < promises.length; i += parallelism) {
      const endIndex = Math.min(i + parallelism - 1, promises.length - 1);
      try {
        console.log(
          `Analysing files from ${i} to ${endIndex} (out of ${promises.length}) for ${projectPath}`,
        );
        await Promise.all(promises.slice(i, endIndex + 1));
      } catch (e) {
        console.error(`Failed analyzing files: ${files.slice(i, endIndex + 1)}`);
      }
    }
  }
}
