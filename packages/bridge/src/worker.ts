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
import { APIError, ErrorCode } from '@sonar/shared/errors';

if (parentPort) {
  setContext(workerData.context);

  const parentThread = parentPort;
  parentThread.on('message', async msg => {
    try {
      const { type, data } = msg;
      if (data?.filePath && !data.fileContent) {
        data.fileContent = await readFile(data.filePath);
      }

      switch (type) {
        case 'on-analyze-css': {
          const output = await analyzeCSS(data);
          parentThread.postMessage({ type: 'success', result: output });
          break;
        }

        case 'on-analyze-html': {
          const output = await analyzeHTML(data);
          parentThread.postMessage({ type: 'success', result: output });
          break;
        }

        case 'on-analyze-js': {
          const output = analyzeJSTS(data, 'js');
          parentThread.postMessage({ type: 'success', result: output });
          break;
        }

        case 'on-analyze-ts': {
          const output = analyzeJSTS(data, 'ts');
          parentThread.postMessage({ type: 'success', result: output });
          break;
        }

        case 'on-analyze-yaml': {
          const output = await analyzeYAML(data);
          parentThread.postMessage({ type: 'success', result: output });
          break;
        }

        case 'on-create-program': {
          const { tsConfig } = data;
          const { programId, files, projectReferences, missingTsConfig } =
            createAndSaveProgram(tsConfig);
          parentThread.postMessage({
            type: 'success',
            result: { programId, files, projectReferences, missingTsConfig },
          });
          break;
        }

        case 'on-create-tsconfig-file': {
          const tsConfigContent = data;
          const tsConfigFile = await writeTSConfigFile(tsConfigContent);
          parentThread.postMessage({ type: 'success', result: tsConfigFile });
          break;
        }

        case 'on-delete-program': {
          const { programId } = data;
          deleteProgram(programId);
          parentThread.postMessage({ type: 'success', result: 'OK!' });
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
          parentThread.postMessage({ type: 'success', result: 'OK!' });
          break;
        }

        case 'on-new-tsconfig': {
          clearTypeScriptESLintParserCaches();
          parentThread.postMessage({ type: 'success', result: 'OK!' });
          break;
        }

        case 'on-tsconfig-files': {
          const { tsconfig } = data;
          const options = createProgramOptions(tsconfig);
          parentThread.postMessage({
            type: 'success',
            result: {
              files: options.rootNames,
              projectReferences: options.projectReferences
                ? options.projectReferences.map(ref => ref.path)
                : [],
            },
          });
          break;
        }
      }
    } catch (err) {
      parentThread.postMessage({ type: 'failure', error: serializeError(err) });
    }
  });

  /**
   * The default (de)serialization mechanism of the Worker Thread API cannot be used
   * to (de)serialize Error instances. To address this, we turn those instances into
   * regular JavaScript objects.
   */
  function serializeError(err: any) {
    switch (true) {
      case err instanceof APIError:
        return { code: err.code, message: err.message, stack: err.stack, data: err.data };
      case err instanceof Error:
        return { code: ErrorCode.Unexpected, message: err.message, stack: err.stack };
      default:
        return { code: ErrorCode.Unexpected, message: err };
    }
  }
}
