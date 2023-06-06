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
/**
 * This file provides an API to take control over TypeScript's Program instances
 * in the context of program-based analysis for JavaScript / TypeScript.
 *
 * A TypeScript's Program instance is used by TypeScript ESLint parser in order
 * to make available TypeScript's type checker for rules willing to use type
 * information for the sake of precision. It works similarly as using TSConfigs
 * except it gives the control over the lifecycle of this internal data structure
 * used by the parser and improves performance.
 */

import path from 'path';
import ts from 'typescript';
import {
  addTsConfigIfDirectory,
  debug,
  ProgramResult,
  ProjectTSConfigs,
  readFileSync,
  toUnixPath,
} from 'helpers';

import { ProgramCache } from 'helpers/cache';
import { JsTsAnalysisInput } from 'services/analysis';

export const programCache = new ProgramCache();
const projectTSConfigsByBaseDir: Map<string, ProjectTSConfigs> = new Map<
  string,
  ProjectTSConfigs
>();

export function setDefaultTSConfigs(baseDir: string, tsConfigs: ProjectTSConfigs) {
  // used only in tests
  projectTSConfigsByBaseDir.set(baseDir, tsConfigs);
}

export function getDefaultTSConfigs(baseDir: string, inputTSConfigs?: string[]) {
  let tsConfigs = projectTSConfigsByBaseDir.get(baseDir);
  if (!tsConfigs) {
    tsConfigs = new ProjectTSConfigs(baseDir, inputTSConfigs);
    projectTSConfigsByBaseDir.set(baseDir, tsConfigs);
  }
  return tsConfigs;
}

/**
 * Creates or gets the proper existing TypeScript's Program containing a given source file.
 * @param input JS/TS Analysis input request
 * @param cache the LRU cache object to use as cache
 * @param tsconfigs the TSConfigs DB instance to use
 * @returns the retrieved TypeScript's Program
 */
export function getProgramForFile(
  input: JsTsAnalysisInput,
  cache = programCache,
  tsconfigs?: ProjectTSConfigs,
): ts.Program {
  /**
   * SONARJS_LIMIT_DEPS_RESOLUTION is available to limit TS resolution to current baseDir.
   * However, this does not apply when we rely on typescript-eslint to create watchPrograms.
   * If we are ever able to provide our own compilerHost to typescript-eslint, we can generalize
   * for all projects and avoid removing node_modules for ruling tests
   */
  const topDir =
    process.env['SONARJS_LIMIT_DEPS_RESOLUTION'] === '1' ? toUnixPath(input.baseDir) : undefined;

  if (!tsconfigs) {
    tsconfigs = getDefaultTSConfigs(input.baseDir, input.tsConfigs);
  }
  if (input.forceUpdateTSConfigs) {
    // if at least a tsconfig changed, removed cache of programs, as files
    // could now belong to another program
    const newTsConfigs = tsconfigs.tsConfigLookup(input.baseDir);
    if (newTsConfigs) {
      programCache.clear();
    }
  }

  const normalizedPath = toUnixPath(input.filePath);
  for (const tsconfig of tsconfigs.iterateTSConfigs(normalizedPath, input.tsConfigs)) {
    try {
      if (!tsconfig.isFallbackTSConfig) {
        // looping through actual tsconfigs in fs
        let programResult = cache.programs.get(tsconfig.filename);

        if (
          !programResult ||
          (programResult.files.includes(normalizedPath) && !programResult.program.deref())
        ) {
          programResult = createProgram(tsconfig.filename, tsconfig.contents, topDir);
          cache.programs.set(tsconfig.filename, programResult);
        }
        if (programResult.files.includes(normalizedPath)) {
          const program = programResult.program.deref()!;
          cache.lru.set(program);
          debug(`Analyzing ${input.filePath} using tsconfig ${tsconfig.filename}`);
          return program;
        }
      } else {
        // last item in loop is a fallback tsConfig
        //we first check existing fallback programs
        for (const [tsConfigPath, programResult] of cache.programs) {
          if (programResult.files.includes(normalizedPath) && programResult.isFallbackProgram) {
            const program = programResult.program.deref();
            if (program) {
              cache.lru.set(program);
              debug(`Analyzing file ${input.filePath} using tsconfig ${tsConfigPath}`);
              return program;
            } else {
              cache.programs.delete(tsConfigPath);
            }
          }
        }
        // no existing fallback program contained our file, creating a fallback program with our file
        const programResult = createProgram(tsconfig.filename, tsconfig.contents, topDir);
        programResult.isFallbackProgram = true;
        cache.programs.set(tsconfig.filename, programResult);
        if (programResult.files.includes(normalizedPath)) {
          const program = programResult.program.deref()!;
          cache.lru.set(program);
          debug(`Analyzing file ${input.filePath} using tsconfig ${tsconfig.filename}`);
          return program;
        }
      }
    } catch (e) {
      console.log(
        `ERROR: Failed create program with tsconfig ${tsconfig.filename}}. Error: ${e.message}`,
      );
    }
  }
  throw Error(`Could not create a program containing ${normalizedPath}`);
}

/**
 * Gets the files resolved by a TSConfig
 *
 * The resolving of the files for a given TSConfig file is done
 * by invoking TypeScript compiler.
 *
 * @param tsConfig TSConfig to parse
 * @param tsconfigContents TSConfig contents that we want to provide to TSConfig
 * @param topDir root of the project, if set we will not allow TS to search for tsconfig files
 *        above this path
 * @returns the resolved TSConfig files
 */
export function createProgramOptions(
  tsConfig: string,
  tsconfigContents?: string,
  topDir?: string,
): ts.CreateProgramOptions & { missingTsConfig: boolean } {
  let missingTsConfig = false;

  const parseConfigHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: ts.sys.readDirectory,
    fileExists: file => {
      // When Typescript checks for the very last tsconfig.json, we will always return true,
      // If the file does not exist in FS, we will return an empty configuration
      if (topDir && !file.startsWith(toUnixPath(topDir))) {
        return false;
      }
      if (isLastTsConfigCheck(file, topDir)) {
        return true;
      }
      return ts.sys.fileExists(file);
    },
    readFile: file => {
      if (file === tsConfig && tsconfigContents) {
        return tsconfigContents;
      }
      const fileContents = ts.sys.readFile(file);
      // When Typescript search for tsconfig which does not exist, return empty configuration
      // only when the check is for the last location at the root node_modules
      if (!fileContents && isLastTsConfigCheck(file, topDir)) {
        missingTsConfig = true;
        console.log(
          `WARN Could not find tsconfig.json: ${file}; falling back to an empty configuration.`,
        );
        return '{}';
      }
      return fileContents;
    },
  };
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  if (config.error) {
    console.error(`Failed to parse tsconfig: ${tsConfig} (${diagnosticToString(config.error)})`);
    throw Error(diagnosticToString(config.error));
  }

  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config.config,
    parseConfigHost,
    path.resolve(path.dirname(tsConfig)),
    {
      noEmit: true,
    },
    tsConfig,
    undefined,
    [
      {
        extension: 'vue',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],
  );

  if (parsedConfigFile.errors.length > 0) {
    const message = parsedConfigFile.errors.map(diagnosticToString).join('; ');
    throw Error(message);
  }

  return {
    rootNames: parsedConfigFile.fileNames,
    options: { ...parsedConfigFile.options, allowNonTsExtensions: true },
    projectReferences: parsedConfigFile.projectReferences,
    missingTsConfig,
  };
}

/**
 * Creates a TypeScript's Program instance
 *
 * TypeScript creates a Program instance per TSConfig file. This means that one
 * needs a TSConfig to create such a program. Therefore, the function expects a
 * TSConfig as an input, parses it and uses it to create a TypeScript's Program
 * instance. The program creation delegates to TypeScript the resolving of input
 * files considered by the TSConfig as well as any project references.
 *
 * @param tsConfig the TSConfig input to create a program for
 * @param tsconfigContents TSConfig contents that we want to provide to TSConfig
 * @param topDir root of the project, if set we will not allow TS to search for
 *        dependencies above this path
 * @returns the identifier of the created TypeScript's Program along with the
 *          program itself, the resolved files, project references and a boolean
 *          'missingTsConfig' which is true when an extended tsconfig.json path
 *          was not found, which defaulted to default Typescript configuration
 */
export function createProgram(
  tsConfig: string,
  tsconfigContents?: string,
  topDir?: string,
): ProgramResult {
  if (!tsconfigContents) {
    tsconfigContents = readFileSync(tsConfig);
  }
  const programOptions = createProgramOptions(tsConfig, tsconfigContents, topDir);

  if (topDir) {
    programOptions.host = ts.createCompilerHost(programOptions.options);

    const originalFileExists = programOptions.host.fileExists;
    // Ignore files outside the topDir
    programOptions.host.fileExists = fileName => {
      if (path.isAbsolute(fileName) && !fileName.startsWith(topDir)) {
        return false;
      }
      return originalFileExists(fileName);
    };
  }

  const program = ts.createProgram(programOptions);
  const inputProjectReferences = program.getProjectReferences() || [];
  const projectReferences: string[] = [];

  for (const reference of inputProjectReferences) {
    const sanitizedReference = addTsConfigIfDirectory(reference.path);
    if (!sanitizedReference) {
      console.log(`WARN Skipping missing referenced tsconfig.json: ${reference.path}`);
    } else {
      projectReferences.push(sanitizedReference);
    }
  }
  const files = program.getSourceFiles().map(sourceFile => sourceFile.fileName);

  return {
    files,
    projectReferences,
    missingTsConfig: programOptions.missingTsConfig,
    program: new WeakRef(program),
    tsConfig: {
      filename: tsConfig,
      contents: tsconfigContents,
    },
  };
}

function diagnosticToString(diagnostic: ts.Diagnostic): string {
  const text =
    typeof diagnostic.messageText === 'string'
      ? diagnostic.messageText
      : diagnostic.messageText.messageText;
  if (diagnostic.file) {
    return `${text}  ${diagnostic.file?.fileName}:${diagnostic.start}`;
  } else {
    return text;
  }
}

/**
 * Typescript resolution will always start searching by first looking for package.json files
 * starting in $TSCONFIG_PATH/package.json and on each parent until root folder.
 * 1 - $TSCONFIG_PATH/package.json
 * 2 - $TSCONFIG_PATH/../package.json
 * 3 - $TSCONFIG_PATH/../../package.json
 * ...
 * N - /package.json
 *
 * Then, Typescript resolution will always search for extended tsconfigs in these 5 paths (in order):
 *
 * 1 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/package.json
 * 2 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/../package.json
 * 3 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE
 * 4 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE.json
 * 5 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/tsconfig.json
 *
 * If not found in all 4, $TSCONFIG_PATH will be assigned to its parent and the same search will be performed,
 * until $TSCONFIG_PATH is the system root. Meaning, the very last search Typescript will perform is (5) when
 * TSCONFIG_PATH === '/':
 *
 * /node_modules/$EXTENDED_TSCONFIG_VALUE/tsconfig.json
 *
 * @param file
 * @param topDir root of the project, we will not allow TS to search above this path if set
 */
function isLastTsConfigCheck(file: string, topDir?: string) {
  return path.basename(file) === 'tsconfig.json' && isRootNodeModules(file, topDir);
}
export function isRootNodeModules(file: string, topDir?: string) {
  if (!topDir) {
    topDir = path.parse(file).root;
  }
  const normalizedFile = toUnixPath(file);
  const topNodeModules = toUnixPath(path.resolve(path.join(topDir, 'node_modules')));
  return normalizedFile.startsWith(topNodeModules);
}

export function isRoot(file: string) {
  return toUnixPath(file) === toUnixPath(path.parse(file).root);
}
