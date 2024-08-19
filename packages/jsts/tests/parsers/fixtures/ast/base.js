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
let a = null;
require('module-alias/register');

import
  * as console        // namespace import specifier
  from 'console'

const formData = require('form-data');
const { parentPort, workerData } = require('worker_threads');
const {
  analyzeJSTS,
  clearTypeScriptESLintParserCaches,
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
  initializeLinter,
  writeTSConfigFile,
  loadPackageJsons,
  analyzeProject,
} = require('@sonar/jsts');
const { readFile, setContext } = require('@sonar/shared/helpers');
const { analyzeCSS } = require('@sonar/css');
const { analyzeHTML } = require('@sonar/html');
const { analyzeYAML } = require('@sonar/yaml');
const { APIError, ErrorCode } = require('@sonar/shared/errors');
const { logHeapStatistics } = require('@sonar/bridge/memory');

export * from "module-name";
/**
 * Delegate the handling of an HTTP request to a worker thread
 */
exports.delegate = function (worker, type) {
  return async (request, response, next) => {
    worker.once('message', message => {
      switch (message.type) {
        case 'success':
          if (message.format === 'multipart') {
            const fd = new formData();
            fd.append('ast', message.result.ast);
            delete message.result.ast;
            fd.append('json', JSON.stringify(message.result));
            // this adds the boundary string that will be used to separate the parts
            response.set('Content-Type', fd.getHeaders()['content-type']);
            response.set('Content-Length', fd.getLengthSync());
            fd.pipe(response);
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
            format: 'multipart',
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
            format: 'multipart',
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
          const { rules, environments, globals, linterId, baseDir, exclusions } = data;
          initializeLinter(rules, environments, globals, linterId);
          if (baseDir) {
            loadPackageJsons(baseDir, exclusions);
          }
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

// To improve coverage of different JS feature.
debugger;
let str = '';

loop1: for (let i = 0; i < 5; i++) {
  if (i === 1) {
    continue loop1;
  }
  str = str + i;
}
while (true) {
  break;
}

do {
  str = str + 'a';
} while (str.length < 10);

const iterable = [10, 20, 30];
let sum = 0;
for (const value of iterable) {
  sum += value;
}

const object = { a: 1, b: 2, c: 3 };
for (const property in object) {
  str = str + object[property];
}

export function functionName() { /* … */ }

const z = y = x = f();

class ClassWithStaticInitializationBlock {
  static staticProperty1 = 'Property 1';
  static staticProperty2;
  static {
    this.staticProperty2 = 'Property 2';
  }
}

const object1 = {};

Object.defineProperty(object1, 'property1', {
  value: 42,
  writable: false,
});

object1.property1 = 77;

const Rectangle = class {
  constructor(height, width) {
    this.height = height;
    this.width = width;
  }
  area() {
    return this.height * this.width;
  }
};

// Example of private identifier usage
class Circle {
  #radius;
  constructor(radius) {
    this.#radius = radius;
  }
  area() {
    return Math.PI * this.#radius ** 2;
  }
}

class Square extends Rectangle {
  constructor(length) {
    super(length, length);
  }
}

function Person(name) {
  this.name = name;
}

function metaProperty() {
  return new.target;
}

function Foo() {
  if (!new.target) {
    throw new TypeError('calling Foo constructor without new is invalid');
  }
}

try {
  Foo();
} catch (e) {
  console.log(e);
  // Expected output: TypeError: calling Foo constructor without new is invalid
}

const [a1, b1] = [1, 2];
const [a2, ...b2] = [1, 2, 3];
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];
const arrWithEmptyElements = [, , 5];
const [, pattern, withEmpty, , elements] = [1, 2, 3, 4, 5, 6]

let a3;
a3 = 1, 2, 3;
const myTag = (strs, ...values) => {
  console.log(strs);
  console.log(values);
}

function tag(strings, ...values) {
  return { strings, values };
}

function* generator(i) {
  yield i;
  yield i + 10;
}

let num = 10;
num++;
num--;

(1, 2)

`hello ${num}`

const [fooA, fooB] = foo;

class FooStatic {
  static {
    console.log('static block');
  }
}
