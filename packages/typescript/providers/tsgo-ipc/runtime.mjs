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
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { CompilerContractError } from '../../errors.cjs';
import { sys, entries } from './filesystem.mjs';

export function createRuntime(API, serverFS, executable, expectedVersion) {
  let api,
    activeHost = sys,
    generation = 0;
  let inCallback = false;
  const callback = operation => {
    const previous = inCallback;
    inCallback = true;
    try {
      return operation();
    } finally {
      inCallback = previous;
    }
  };
  function current() {
    if (!api && !existsSync(executable))
      throw new CompilerContractError(
        `TSGo executable is unavailable: ${executable}; run npm run compiler:prepare`,
      );
    if (!api && expectedVersion) {
      const installed = JSON.parse(
        readFileSync(path.join(path.dirname(executable), 'version.json'), 'utf8'),
      );
      if (installed.version !== expectedVersion)
        throw new CompilerContractError(
          'TSGo executable and JavaScript client versions differ; run npm run compiler:prepare',
        );
    }
    if (!api)
      api = new API({
        tsserverPath: executable,
        cwd: sys.getCurrentDirectory(),
        useCaseSensitiveFileNames: sys.useCaseSensitiveFileNames,
        collectTiming: true,
        fs: {
          readFile: file => callback(() => activeHost.readFile(file)),
          fileExists: file => callback(() => activeHost.fileExists(file)),
          directoryExists: file =>
            callback(
              () =>
                activeHost.directoryExists?.(file) ??
                // ParseConfigHost only has readDirectory. Derive virtual parent directories
                // rather than granting unrequested access to the server's disk.
                (activeHost === sys ? sys.directoryExists(file) : true),
            ),
          realpath: file => callback(() => activeHost.realpath?.(file) ?? file),
          getAccessibleEntries: directory =>
            callback(() => {
              if (activeHost === sys) return entries(directory);
              const files =
                activeHost.readDirectory?.(
                  directory,
                  undefined,
                  undefined,
                  [activeHost.getDirectories ? '*' : '**/*'],
                  activeHost.getDirectories ? 1 : undefined,
                ) ?? [];
              const directories = new Set(
                (activeHost.getDirectories?.(directory) ?? []).map(file => path.basename(file)),
              );
              const direct = [];
              for (const file of files) {
                const relative = path.posix.relative(directory, file.replaceAll('\\', '/'));
                if (relative.startsWith('../')) continue;
                if (relative.includes('/')) directories.add(relative.split('/')[0]);
                else direct.push(relative);
              }
              return {
                files: direct,
                directories: [...directories],
                symlinks: undefined,
              };
            }),
          stat: serverFS.fakeStat,
          writeFile: serverFS.noop,
          removeFile: serverFS.noop,
        },
      });
    return api;
  }
  function invoke(host, operation, expectedGeneration = generation) {
    if (inCallback)
      throw new CompilerContractError('TSGo IPC cannot be re-entered from a filesystem callback');
    if (expectedGeneration !== generation)
      throw new CompilerContractError('TSGo IPC session was closed; recreate the program');
    const previous = activeHost;
    activeHost = host ?? sys;
    try {
      return operation(current());
    } catch (cause) {
      if (cause instanceof CompilerContractError) throw cause;
      if (
        /Unexpected EOF|EPIPE|EBADF|ECONNRESET|channel is closed|callback|^panic:/i.test(
          cause.message ?? '',
        )
      ) {
        try {
          api?.close();
        } catch {
        } finally {
          api = undefined;
          generation++;
        }
      }
      const error = new CompilerContractError(`TSGo IPC: ${cause.message ?? cause}`);
      error.cause = cause;
      throw error;
    } finally {
      activeHost = previous;
    }
  }
  return {
    invoke,
    bind: host => {
      const expectedGeneration = generation;
      return operation => invoke(host, operation, expectedGeneration);
    },
    close() {
      try {
        api?.close();
      } finally {
        api = undefined;
        generation++;
      }
    },
    timing: () => invoke(sys, api => api.getTimingInfo()),
  };
}
