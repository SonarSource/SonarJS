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
import type ts from 'typescript';
import {
  createNativePrograms,
  releaseNativePrograms,
  assertNativeProgramsHealthy,
} from './session.mjs';

import type { ProgramOptions } from '../program/tsconfig/options.js';
import { getCurrentFilesContext } from '../program/cache/sourceFileCache.js';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';

/**
 * Reuse IDE native sessions across requests, updating snapshots for changed files.
 *
 * @param baseDir The base directory for resolving module paths
 * @param sourceFile The source file to create or find a program for
 * @param getProgramOptions Getter for program options to use for the program
 */
export function createOrGetCachedProgramForFile(
  baseDir: NormalizedAbsolutePath,
  sourceFile: NormalizedAbsolutePath,
  getProgramOptions: () => ProgramOptions | undefined,
  skipNodeModuleLookupOutsideBaseDir = false,
) {
  if (getCurrentFilesContext() !== nativeRequestContext) prepareNativeProgramRequest();
  for (const entry of nativeRequestPrograms) {
    if (
      entry.baseDir === baseDir &&
      entry.skipOutsideNodeModules === skipNodeModuleLookupOutsideBaseDir &&
      entry.files.has(sourceFile)
    ) {
      nativeRequestPrograms = nativeRequestPrograms.filter(candidate => candidate !== entry);
      nativeRequestPrograms.push(entry);
      return entry.session.programs[0] as ts.Program;
    }
  }
  const options = getProgramOptions();
  if (!options) return undefined;
  const session = createNativePrograms([options], {
    cwd: baseDir,
    skipOutsideNodeModules: skipNodeModuleLookupOutsideBaseDir,
  });
  const program = session.programs[0] as ts.Program;
  nativeRequestPrograms.push({
    session,
    baseDir,
    skipOutsideNodeModules: skipNodeModuleLookupOutsideBaseDir,
    files: new Set(session.rawPrograms[0].getSourceFileNames()),
  });
  // Native processes cannot be garbage-collected like the previous JS programs.
  if (nativeRequestPrograms.length > 10) nativeRequestPrograms.shift()!.session.dispose();
  return program;
}

let nativeRequestContext: ReturnType<typeof getCurrentFilesContext> | undefined;
let nativeRequestPrograms: {
  session: ReturnType<typeof createNativePrograms>;
  baseDir: NormalizedAbsolutePath;
  skipOutsideNodeModules: boolean;
  files: Set<string>;
}[] = [];

export function prepareNativeProgramRequest(fsEvents: readonly string[] = []) {
  const context = getCurrentFilesContext();
  if (context === nativeRequestContext) return;
  nativeRequestContext = context;
  const files = new Map(
    Object.entries(context ?? {})
      .filter(([, value]) => value.fileContent !== undefined)
      .map(([file, value]) => [file, value.fileContent!] as const),
  );
  const changedPaths = [
    ...new Set([
      ...fsEvents,
      ...Object.entries(context ?? {})
        .filter(([, value]) => value.fileContent === undefined)
        .map(([file]) => file),
    ]),
  ];
  try {
    for (const entry of nativeRequestPrograms) {
      entry.session.update(files, changedPaths);
      entry.files = new Set(entry.session.rawPrograms[0].getSourceFileNames());
    }
  } catch (error) {
    clearNativeProgramCache();
    throw error;
  }
}

export function finishNativeProgramRequest(keepForIDE: boolean) {
  if (!keepForIDE) return clearNativeProgramCache();
  try {
    assertNativeProgramsHealthy();
  } catch (error) {
    clearNativeProgramCache();
    throw error;
  }
}

export function clearNativeProgramCache() {
  nativeRequestContext = undefined;
  nativeRequestPrograms = [];
  releaseNativePrograms();
}
