/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
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
import { debug, error, warn } from '../../../shared/src/helpers/logging.js';
import {
  readFileSync,
  toUnixPath,
  addTsConfigIfDirectory,
} from '../../../shared/src/helpers/files.js';

type ProgramResult = {
  files: string[];
  projectReferences: string[];
  missingTsConfig: boolean;
  program: ts.Program;
  programId?: string;
};

/**
 * Gets the files resolved by a TSConfig
 *
 * The resolving of the files for a given TSConfig file is done
 * by invoking TypeScript compiler.
 *
 * @param tsConfig TSConfig to parse
 * @param tsconfigContents TSConfig contents that we want to provide to TSConfig
 * @returns the resolved TSConfig files
 */
export function createProgramOptions(
  tsConfig: string,
  tsconfigContents?: string,
): ts.CreateProgramOptions & { missingTsConfig: boolean } {
  let missingTsConfig = false;

  const parseConfigHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: ts.sys.readDirectory,
    fileExists: file => {
      // When Typescript checks for the very last tsconfig.json, we will always return true,
      // If the file does not exist in FS, we will return an empty configuration
      if (isLastTsConfigCheck(file)) {
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
      if (!fileContents && isLastTsConfigCheck(file)) {
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
    error(`Failed to parse tsconfig: ${tsConfig} (${diagnosticToString(config.error)})`);
    throw Error(diagnosticToString(config.error));
  }

  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config.config,
    parseConfigHost,
    path.resolve(path.dirname(tsConfig)),
    {
      noEmit: true,
    },
    path.resolve(tsConfig),
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
 * @returns the identifier of the created TypeScript's Program along with the
 *          program itself, the resolved files, project references and a boolean
 *          'missingTsConfig' which is true when an extended tsconfig.json path
 *          was not found, which defaulted to default Typescript configuration
 */
export function createProgram(tsConfig: string, tsconfigContents?: string): ProgramResult {
  if (!tsconfigContents) {
    tsconfigContents = readFileSync(tsConfig);
  }
  const programOptions = createProgramOptions(tsConfig, tsconfigContents);
  const program = ts.createProgram(programOptions);
  const inputProjectReferences = program.getProjectReferences() ?? [];
  const projectReferences: string[] = [];

  for (const reference of inputProjectReferences) {
    const sanitizedReference = addTsConfigIfDirectory(reference.path);
    if (!sanitizedReference) {
      warn(`Skipping missing referenced tsconfig.json: ${reference.path}`);
    } else {
      projectReferences.push(sanitizedReference);
    }
  }
  const files = program
    .getSourceFiles()
    .map(sourceFile => sourceFile.fileName)
    .filter(exceptions);

  return {
    files,
    projectReferences,
    missingTsConfig: programOptions.missingTsConfig,
    program,
  };

  function exceptions(filename: string) {
    const { dir, ext } = path.parse(filename);

    /* JSON files */
    if (ext === '.json') {
      return false;
    }

    /* Node modules */
    if (toUnixPath(dir).split('/').includes('node_modules')) {
      return false;
    }

    return true;
  }
}

/**
 * A cache of created TypeScript's Program instances
 *
 * It associates a program identifier to an instance of a TypeScript's Program.
 */
const programs = new Map<string, ts.Program>();

/**
 * A counter of created TypeScript's Program instances
 */
let programCount = 0;

/**
 * Computes the next identifier available for a TypeScript's Program.
 * @returns
 */
function nextId() {
  programCount++;
  return programCount.toString();
}

/**
 * Creates a TypeScript's Program instance and saves it in memory
 *
 * To be removed once Java part does not handle program creation
 */
export function createAndSaveProgram(tsConfig: string): ProgramResult & { programId: string } {
  const program = createProgram(tsConfig);

  const programId = nextId();
  programs.set(programId, program.program);
  debug(`program from ${tsConfig} with id ${programId} is created`);
  return { ...program, programId };
}

/**
 * Gets an existing TypeScript's Program by its identifier
 * @param programId the identifier of the TypeScript's Program to retrieve
 * @throws a runtime error if there is no such program
 * @returns the retrieved TypeScript's Program
 */
export function getProgramById(programId: string): ts.Program {
  const program = programs.get(programId);
  if (!program) {
    throw Error(`Failed to find program ${programId}`);
  }
  return program;
}

/**
 * Deletes an existing TypeScript's Program by its identifier
 * @param programId the identifier of the TypeScript's Program to delete
 */
export function deleteProgram(programId: string): void {
  programs.delete(programId);
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
 */
function isLastTsConfigCheck(file: string) {
  return path.basename(file) === 'tsconfig.json' && isRootNodeModules(file);
}

export function isRootNodeModules(file: string) {
  const root = process.platform === 'win32' ? file.slice(0, file.indexOf(':') + 1) : '/';
  const normalizedFile = toUnixPath(file);
  const topNodeModules = toUnixPath(path.resolve(path.join(root, 'node_modules')));
  return normalizedFile.startsWith(topNodeModules);
}
