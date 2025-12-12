/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import fs from 'node:fs';
import path from 'node:path/posix';

/**
 * Byte Order Marker
 */
const BOM_BYTE = 0xfeff;

/**
 * The type of input file
 *
 * The scanner indexes input files based on the project configuration,
 * if any. It determines wheter an input file denotes a `MAIN` file,
 * i.e., a source file, or a `TEST` file.
 *
 * The type of input file is then used by the linter to select which
 * rule configurations to apply, that is, which rules the linter should
 * use to analyze the file.
 */
export type FileType = 'MAIN' | 'TEST';

/**
 * Asynchronous read of file contents from a file path
 *
 * The function gets rid of any Byte Order Marker (BOM)
 * present in the file's header.
 *
 * @param filePath the path of a file
 * @returns Promise which resolves with the content of the file
 */
export async function readFile(filePath: string) {
  const fileContent = await fs.promises.readFile(filePath, { encoding: 'utf8' });
  return stripBOM(fileContent);
}

/**
 * Removes any Byte Order Marker (BOM) from a string's head
 *
 * A string's head is nothing else but its first character.
 *
 * @param str the input string
 * @returns the stripped string
 */
function stripBOM(str: string) {
  if (str.codePointAt(0) === BOM_BYTE) {
    return str.slice(1);
  }
  return str;
}
/**
 * Converts a path to Unix format
 * @param filePath the path to convert
 * @returns the converted path
 */
export function toUnixPath(filePath: string) {
  return filePath.replaceAll(/[\\/]+/g, '/');
}

/**
 * Adds tsconfig.json to a path if it does not exist
 *
 * @param tsConfig
 */
export function addTsConfigIfDirectory(tsConfig: string) {
  try {
    if (fs.lstatSync(tsConfig).isDirectory()) {
      return path.join(tsConfig, 'tsconfig.json');
    }

    return tsConfig;
  } catch {
    return null;
  }
}
