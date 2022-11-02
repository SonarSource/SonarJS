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
  address: () => { return { port: 64829 }}
};

const RULE_ID = 'no-commented-code';
//const FOLDER = path.join(__dirname, '../lib');
//const FOLDER = path.join(__dirname, '../../its/sources/amplify/src');
const folders = [
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
];

(async () => {
  await requestInitLinter(server as http.Server, 'MAIN', RULE_ID);

  for (let i=0; i<folders.length; i++) {
    await analyzeProject(folders[i]);
  }
  //await analyzeProject(FOLDER);
  console.log('done');
})();

async function analyzeProject(projectPath: string) {
  console.log('####################################');
  console.log(`# analyzing ${projectPath} #`);
  console.log('####################################');

  let files: string[] = [];
  collectFilesInFolder(projectPath);
  console.log('got files', files.length);
  files = files.filter(isJSFile);
  console.log('got JS files', files.length);
  const promises = buildPromises(files);
  await executePromises(promises, 5);

  async function executePromises(promises: Promise<unknown>[], parallelism: number) {
    for (let i=0; i<promises.length; i += parallelism) {
      const endIndex = Math.min(i + parallelism - 1, promises.length - 1);
      try {
        console.log('executing promises from', i, 'to', endIndex, 'for', projectPath);
        await Promise.all(promises.slice(i, endIndex + 1));
      } catch (e) {
        console.error('failed analyzing files', files.slice(i, endIndex + 1));
      }
    }
  }

  function buildPromises(files: string[]) {
    const promises: Promise<unknown>[] = [];
    files.forEach(filePath => {
      promises.push(analyzeFile(filePath));
    });
    return promises;

    async function analyzeFile(filePath: string) {
      const response = await request(server as http.Server, '/analyze-js', 'POST', {
        filePath,
        fileType: 'MAIN',
        linterId: 'default',
      });
      return response;    }
  }

  function isJSFile(filePath: string) {
    return filePath.endsWith('.js');
  }

  function collectFilesInFolder(folder: string) {
    fs.readdirSync(folder).forEach(file => {
      const filePath = path.join(folder, file);
      if (fs.statSync(filePath).isDirectory()) {
        return collectFilesInFolder(filePath);
      } else {
        return files.push(filePath);
      }
    })
  }
}

function requestInitLinter(server: http.Server, fileType: string, ruleId: string) {
  const config = {
    rules: [{ key: ruleId, configurations: [], fileTypeTarget: fileType }],
  };
  return request(server, '/init-linter', 'POST', config);
}
