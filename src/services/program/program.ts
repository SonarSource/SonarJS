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
import { addTsConfigIfDirectory, debug, toUnixPath } from 'helpers';
import { parsers } from 'parsing/jsts';

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

export function createProgramOptions(
  tsConfig: string,
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
 * @returns the identifier of the created TypeScript's Program along with the
 *          resolved files, project references and a boolean 'missingTsConfig'
 *          which is true when an extended tsconfig.json path was not found,
 *          which defaulted to default Typescript configuration
 */
export async function createProgram(tsConfig: string): Promise<{
  programId: string;
  files: string[];
  projectReferences: string[];
  missingTsConfig: boolean;
}> {
  const programOptions = createProgramOptions(tsConfig);

  programOptions.host = ts.createCompilerHost(programOptions.options);

  /**
   * Empty AST to be sent to Vue parser, as we just use it to provide us with the JS/TS code,
   * no need for it to make further actions with the AST result.
   */
  const emptySourceCode = parsers.javascript.parse('', { requireConfigFile: false });

  const originalReadFile = programOptions.host.readFile;
  // Patch readFile to be able to read only JS/TS from vue files
  programOptions.host.readFile = fileName => {
    const contents = originalReadFile(fileName);
    if (contents && fileName.endsWith('.vue')) {
      const codes: string[] = [];
      parsers.vuejs.parse(contents, {
        parser: {
          parseForESLint: (code: string) => {
            codes.push(code);
            return emptySourceCode;
          },
        },
      });
      return codes.join('');
    }
    return contents;
  };

  const program = ts.createProgram(programOptions);
  const inputProjectReferences = program.getProjectReferences() || [];
  const projectReferences: string[] = [];

  for (const reference of inputProjectReferences) {
    const sanitizedReference = await addTsConfigIfDirectory(reference.path);
    if (!sanitizedReference) {
      console.log(`WARN Skipping missing referenced tsconfig.json: ${reference.path}`);
    } else {
      projectReferences.push(sanitizedReference);
    }
  }
  const files = program.getSourceFiles().map(sourceFile => sourceFile.fileName);

  const programId = nextId();
  programs.set(programId, program);
  debug(`program from ${tsConfig} with id ${programId} is created`);

  return {
    programId,
    files,
    projectReferences,
    missingTsConfig: programOptions.missingTsConfig,
  };
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
 * Typescript resolution will always search for extended tsconfigs in these 4 paths (in order):
 *
 * 1 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/package.json
 * 2 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/../package.json
 * 3 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE
 * 4 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/tsconfig.json
 *
 * If not found in all 4, $TSCONFIG_PATH will be assigned to its parent and the same search will be performed,
 * until $TSCONFIG_PATH is the system root. Meaning, the very last search Typescript will perform is (4) when
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
