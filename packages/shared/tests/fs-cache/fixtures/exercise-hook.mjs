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
import fsDefault, {
  accessSync,
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFile,
  readFileSync,
  readdirSync,
  readSync,
  realpathSync,
  stat,
  statSync,
} from 'node:fs';
import * as fsNamespace from 'fs';
import { readFile as readFilePromise } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const commonJsFs = require('node:fs');
const [root, outside] = process.argv.slice(2);
const file = path.join(root, 'src', 'input.ts');
const directory = path.join(root, 'src');
const missing = path.join(root, 'missing.ts');

const callbackRead = await new Promise((resolve, reject) =>
  readFile(file, 'utf8', (error, value) => (error ? reject(error) : resolve(value))),
);
const callbackSize = await new Promise((resolve, reject) =>
  stat(file, (error, value) => (error ? reject(error) : resolve(value.size))),
);

const optionalRead = await new Promise((resolve, reject) => {
  fsDefault.open(file, (openError, optionalFd) => {
    if (openError) return reject(openError);
    fsDefault.read(optionalFd, (readError, count, buffer) => {
      if (readError) return reject(readError);
      const pastEnd = fsDefault.readSync(optionalFd, Buffer.alloc(4), 0, 4, 10_000);
      fsDefault.close(optionalFd);
      resolve({ content: buffer.subarray(0, count).toString(), pastEnd });
    });
  });
});

const callbackFdReadFile = await new Promise((resolve, reject) => {
  fsDefault.open(file, 'r', (openError, readFileFd) => {
    if (openError) return reject(openError);
    fsDefault.readFile(readFileFd, 'utf8', (readError, content) => {
      fsDefault.closeSync(readFileFd);
      if (readError) return reject(readError);
      resolve(content);
    });
  });
});

const fd = openSync(file, 'r');
const fdBuffer = Buffer.alloc(7);
const bytesRead = readSync(fd, fdBuffer, 0, fdBuffer.length, 0);
const fdSize = fstatSync(fd).size;
const fdBigintStat = fstatSync(fd, { bigint: true });
const fdBigint = {
  nanoseconds: typeof fdBigintStat.atimeNs,
  size: String(fdBigintStat.size),
};
closeSync(fd);

const callbackFdRead = await new Promise((resolve, reject) => {
  fsDefault.open(file, 'r', (openError, callbackFd) => {
    if (openError) return reject(openError);
    const buffer = Buffer.alloc(6);
    fsDefault.read(callbackFd, buffer, 0, buffer.length, 1, (readError, count) => {
      if (readError) return reject(readError);
      fsDefault.fstat(callbackFd, (statError, callbackStat) => {
        if (statError) return reject(statError);
        fsDefault.close(callbackFd, closeError => {
          if (closeError) return reject(closeError);
          resolve({ content: buffer.subarray(0, count).toString(), size: callbackStat.size });
        });
      });
    });
  });
});

const handle = await fsDefault.promises.open(file, 'r');
const handleBuffer = Buffer.alloc(5);
const handleRead = await handle.read(handleBuffer, 0, handleBuffer.length, 2);
const handleSize = (await handle.stat()).size;
await handle.close();

let missingStatCode;
try {
  statSync(missing);
} catch (error) {
  missingStatCode = error.code;
}
const missingSoft = statSync(missing, { throwIfNoEntry: false }) === undefined;

const dynamicFs = await import('node:fs');
const directoryEntries = readdirSync(directory, { withFileTypes: true }).map(entry => ({
  directory: entry.isDirectory(),
  file: entry.isFile(),
  name: entry.name,
}));
const openedDirectory = fsDefault.opendirSync(directory, { recursive: true });
const openedDirectoryIsDir = openedDirectory instanceof fsDefault.Dir;
const openedDirectoryEntries = [];
let openedEntry;
while ((openedEntry = openedDirectory.readSync()) !== null) {
  openedDirectoryEntries.push(openedEntry.name);
}
openedDirectory.closeSync();
const promisedDirectory = await fsDefault.promises.opendir(directory);
const promisedDirectoryEntries = [];
for await (const entry of promisedDirectory) promisedDirectoryEntries.push(entry.name);

accessSync(file);
const result = {
  callback: callbackRead,
  callbackFdRead,
  callbackFdReadFile,
  callbackSize,
  commonjs: commonJsFs.readFileSync(file, 'utf8'),
  default: fsDefault.readFileSync(file, 'utf8'),
  directoryEntries,
  dynamic: dynamicFs.readFileSync(file, 'utf8'),
  exists: existsSync(file),
  fd: fdBuffer.subarray(0, bytesRead).toString(),
  fdBigint,
  fdSize,
  handle: handleBuffer.subarray(0, handleRead.bytesRead).toString(),
  handleSize,
  lstatSize: lstatSync(file).size,
  missingExists: existsSync(missing),
  missingSoft,
  missingStatCode,
  named: readFileSync(file, 'utf8'),
  namespace: fsNamespace.readFileSync(file, 'utf8'),
  openedDirectoryEntries,
  openedDirectoryIsDir,
  optionalRead,
  outside: readFileSync(outside, 'utf8'),
  promise: await readFilePromise(file, 'utf8'),
  promisedDirectoryEntries,
  realpath: path.relative(root, realpathSync(file)).split(path.sep).join('/'),
  statSize: statSync(file).size,
};

console.log(JSON.stringify(result));
