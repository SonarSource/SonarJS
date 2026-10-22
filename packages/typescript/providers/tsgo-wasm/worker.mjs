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
import fs from 'node:fs';
import path from 'node:path';
import { workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { Pipe } from './pipe.mjs';

const input = new Pipe(workerData.input, Infinity, workerData.error),
  output = new Pipe(workerData.output, Infinity, workerData.error);
try {
  // The Go js/wasm runtime delegates syscalls to this object. Compiler filesystem
  // reads use the SDK's host callbacks; only protocol descriptors are intercepted.
  const read = (fd, buffer, offset, length, position, callback) => {
    if (fd !== 0) return fs.read(fd, buffer, offset, length, position, callback);
    try {
      callback(null, input.read(buffer.subarray(offset, offset + length)));
    } catch (error) {
      callback(error);
    }
  };
  const write = (fd, buffer, offset, length, position, callback) => {
    if (fd !== 1) return fs.write(fd, buffer, offset, length, position, callback);
    try {
      output.write(buffer.subarray(offset, offset + length));
      callback(null, length);
    } catch (error) {
      callback(error);
    }
  };
  globalThis.fs = {
    ...fs,
    read,
    write,
    readSync(fd, buffer, offset = 0, length = buffer.length, position = null) {
      return fd === 0
        ? input.read(buffer.subarray(offset, offset + length))
        : fs.readSync(fd, buffer, offset, length, position);
    },
    writeSync(fd, buffer, offset = 0, length = buffer.length, position = null) {
      if (fd !== 1) return fs.writeSync(fd, buffer, offset, length, position);
      output.write(buffer.subarray(offset, offset + length));
      return length;
    },
  };
  const { Go } = await import(
    pathToFileURL(path.join(path.dirname(workerData.executable), 'go-runtime.mjs'))
  );
  const go = new Go();
  go.argv = [workerData.executable, ...workerData.args];
  // Go reserves only 8 KiB for argv and environment. Host callbacks own project
  // access; unrelated analyzer/CI environment variables must not enter Go memory.
  go.env = { TMPDIR: tmpdir(), GOMAXPROCS: '1' };
  go.exit = code => {
    if (code) throw new Error(`TSGo WASM exited: ${code}`);
  };
  const module = new WebAssembly.Module(fs.readFileSync(workerData.executable));
  await go.run(new WebAssembly.Instance(module, go.importObject));
} catch (error) {
  // The caller is blocked in Atomics.wait, so worker console/events cannot
  // reliably deliver startup diagnostics before the caller exits.
  output.close(error);
  input.close(error);
} finally {
  input.close();
  output.close();
}
