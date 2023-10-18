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

require('module-alias/register');

const { parentPort, workerData } = require('worker_threads');
const {
  analyzeJSTS,
  clearTypeScriptESLintParserCaches,
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
  initializeLinter,
  writeTSConfigFile,
} = require('@sonar/jsts');
const { readFile, setContext } = require('@sonar/shared/helpers');
const { analyzeCSS } = require('@sonar/css');
const { analyzeHTML } = require('@sonar/html');
const { analyzeYAML } = require('@sonar/yaml');
const { APIError, ErrorCode } = require('@sonar/shared/errors');
const { logHeapStatistics } = require('@sonar/bridge/memory');

/**
 * Delegate the handling of an HTTP request to a worker thread
 */
exports.delegate = function (worker, type) {
  return async (request, response, next) => {
    worker.once('message', message => {
      switch (message.type) {
        case 'success':
          response.send(message.result);
          break;
        case 'failure':
          next(message.error);
          break;
      }
    });
    worker.postMessage({ type, data: request.body });
  };
};

/**
 * Code executed by the worker thread
 */
if (parentPort) {
  setContext(workerData.context);

  const parentThread = parentPort;
  parentThread.on('message', async message => {
    try {
      const { type, data } = message;
      switch (type) {
        case 'on-analyze-css': {
          await readFileLazily(data);

          const output = await analyzeCSS(data);
          parentThread.postMessage({ type: 'success', result: JSON.stringify(output) });
          break;
        }

        case 'on-analyze-html': {
          await readFileLazily(data);

          const output = await analyzeHTML(data);
          parentThread.postMessage({ type: 'success', result: JSON.stringify(output) });
          break;
        }

        case 'on-analyze-js': {
          await readFileLazily(data);

          const output = analyzeJSTS(data, 'js');
          parentThread.postMessage({ type: 'success', result: JSON.stringify(output) });
          break;
        }

        case 'on-analyze-ts':
        case 'on-analyze-with-program': {
          await readFileLazily(data);

          const output = analyzeJSTS(data, 'ts');
          parentThread.postMessage({ type: 'success', result: JSON.stringify(output) });
          break;
        }

        case 'on-analyze-yaml': {
          await readFileLazily(data);

          const output = await analyzeYAML(data);
          parentThread.postMessage({ type: 'success', result: JSON.stringify(output) });
          break;
        }

        case 'on-create-program': {
          const { tsConfig } = data;
          logHeapStatistics();
          const { programId, files, projectReferences, missingTsConfig } =
            createAndSaveProgram(tsConfig);
          parentThread.postMessage({
            type: 'success',
            result: JSON.stringify({ programId, files, projectReferences, missingTsConfig }),
          });
          break;
        }

        case 'on-create-tsconfig-file': {
          const tsConfigContent = data;
          const tsConfigFile = await writeTSConfigFile(tsConfigContent);
          parentThread.postMessage({ type: 'success', result: JSON.stringify(tsConfigFile) });
          break;
        }

        case 'on-delete-program': {
          const { programId } = data;
          deleteProgram(programId);
          logHeapStatistics();
          parentThread.postMessage({ type: 'success', result: 'OK!' });
          break;
        }

        case 'on-init-linter': {
          const { rules, environments, globals, linterId } = data;
          initializeLinter(rules, environments, globals, linterId);
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
            result: JSON.stringify({
              files: options.rootNames,
              projectReferences: options.projectReferences
                ? options.projectReferences.map(ref => ref.path)
                : [],
            }),
          });
          break;
        }
      }
    } catch (err) {
      parentThread.postMessage({ type: 'failure', error: serializeError(err) });
    }
  });

  /**
   * In SonarQube context, an analysis input includes both path and content of a file
   * to analyze. However, in SonarLint, we might only get the file path. As a result,
   * we read the file if the content is missing in the input.
   */
  async function readFileLazily(input) {
    if (input.filePath && !input.fileContent) {
      input.fileContent = await readFile(input.filePath);
    }
  }

  /**
   * The default (de)serialization mechanism of the Worker Thread API cannot be used
   * to (de)serialize Error instances. To address this, we turn those instances into
   * regular JavaScript objects.
   */
  function serializeError(err) {
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
