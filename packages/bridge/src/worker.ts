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

import 'module-alias/register';

import { parentPort, workerData } from 'worker_threads';
import {
  analyzeJSTS,
  clearTypeScriptESLintParserCaches,
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
  initializeLinter,
  RuleConfig,
  writeTSConfigFile,
} from '@sonar/jsts';
import { readFile, setContext } from '@sonar/shared/helpers';
import { analyzeCSS } from '@sonar/css';
import { analyzeHTML } from '@sonar/html';
import { analyzeYAML } from '@sonar/yaml';

if (parentPort) {
  setContext(workerData.context);

  const parentThread = parentPort;
  parentThread.on('message', async msg => {
    const { type, data } = msg;
    if (data?.filePath && !data.fileContent) {
      data.fileContent = await readFile(data.filePath);
    }

    switch (type) {
      case 'on-analyze-css': {
        const output = await analyzeCSS(data);
        parentThread.postMessage(output);
        break;
      }

      case 'on-analyze-html': {
        const output = await analyzeHTML(data);
        parentThread.postMessage(output);
        break;
      }

      case 'on-analyze-js': {
        const output = analyzeJSTS(data, 'js');
        parentThread.postMessage(output);
        break;
      }

      case 'on-analyze-ts': {
        const output = analyzeJSTS(data, 'ts');
        parentThread.postMessage(output);
        break;
      }

      case 'on-analyze-yaml': {
        const output = await analyzeYAML(data);
        parentThread.postMessage(output);
        break;
      }

      case 'on-create-program': {
        const { tsConfig } = data;
        const { programId, files, projectReferences, missingTsConfig } =
          createAndSaveProgram(tsConfig);
        parentThread.postMessage({ programId, files, projectReferences, missingTsConfig });
        break;
      }

      case 'on-create-tsconfig-file': {
        const tsConfigContent = data;
        const tsConfigFile = await writeTSConfigFile(tsConfigContent);
        parentThread.postMessage(tsConfigFile);
        break;
      }

      case 'on-delete-program': {
        const { programId } = data;
        deleteProgram(programId);
        parentThread.postMessage({ res: 'OK!' });
        break;
      }

      case 'on-init-linter': {
        const { rules, environments, globals, linterId } = data;
        initializeLinter(
          rules as RuleConfig[],
          environments as string[],
          globals as string[],
          linterId,
        );
        parentThread.postMessage({ res: 'OK!' });
        break;
      }

      case 'on-new-tsconfig': {
        clearTypeScriptESLintParserCaches();
        parentThread.postMessage({ res: 'OK!' });
        break;
      }

      case 'on-tsconfig-files': {
        const { tsconfig } = data;
        const options = createProgramOptions(tsconfig);
        parentThread.postMessage({
          files: options.rootNames,
          projectReferences: options.projectReferences
            ? options.projectReferences.map(ref => ref.path)
            : [],
        });
        break;
      }
    }
  });
}
