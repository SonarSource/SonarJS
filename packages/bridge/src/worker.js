/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import { analyzeCSS } from '../../css/src/analysis/analyzer.js';
import { analyzeHTML } from '../../html/src/index.js';
import { analyzeYAML } from '../../yaml/src/index.js';
import { APIError, ErrorCode } from '../../shared/src/errors/error.js';
import { readFile } from '../../shared/src/helpers/files.js';
import { logHeapStatistics } from '../../bridge/src/memory.js';
import formData from 'form-data';
import { parentPort, workerData } from 'worker_threads';
import { setContext } from '../../shared/src/helpers/context.js';
import { analyzeProject } from '../../jsts/src/analysis/projectAnalysis/projectAnalyzer.js';
import { analyzeJSTS } from '../../jsts/src/analysis/analyzer.js';
import {
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
  writeTSConfigFile,
} from '../../jsts/src/program/program.js';
import { initializeLinter } from '../../jsts/src/linter/linters.js';
import { clearTypeScriptESLintParserCaches } from '../../jsts/src/parsers/eslint.js';

/**
 * Delegate the handling of an HTTP request to a worker thread
 */
export const delegate = function (worker, type) {
  return async (request, response, next) => {
    worker.once('message', message => {
      switch (message.type) {
        case 'success':
          if (message.format === 'multipart') {
            sendFormData(message.result, response);
          } else {
            response.send(message.result);
          }
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
        case 'close':
          parentThread.close();
          break;
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
          parentThread.postMessage({
            type: 'success',
            result: output,
            format: output.ast ? 'multipart' : 'json',
          });
          break;
        }

        case 'on-analyze-project': {
          const output = await analyzeProject(data);
          parentThread.postMessage({ type: 'success', result: JSON.stringify(output) });
          break;
        }

        case 'on-analyze-ts':
        case 'on-analyze-with-program': {
          await readFileLazily(data);

          const output = analyzeJSTS(data, 'ts');
          parentThread.postMessage({
            type: 'success',
            result: output,
            format: output.ast ? 'multipart' : 'json',
          });
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
          const { rules, environments, globals, linterId, baseDir } = data;
          await initializeLinter(rules, environments, globals, baseDir, linterId);
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
          const t0 = performance.now();
          const options = createProgramOptions(tsconfig);
          const tTotal = performance.now() - t0;
          // if (tTotal > 100) {
          console.log(`${tsconfig} - time: ${tTotal} ms, files: ${options.rootNames.length}`);
          // }
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

function sendFormData(result, response) {
  const fd = new formData();
  fd.append('ast', Buffer.from(result.ast), { filename: 'ast' });
  delete result.ast;
  fd.append('json', JSON.stringify(result));
  // this adds the boundary string that will be used to separate the parts
  response.set('Content-Type', fd.getHeaders()['content-type']);
  response.set('Content-Length', fd.getLengthSync());
  fd.pipe(response);
}
