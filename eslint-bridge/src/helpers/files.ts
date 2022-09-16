/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { promises as fs, constants } from 'fs';

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
  const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
  return stripBOM(fileContent);
}

/**
 * Async read of file contents from a file path
 *
 * The function gets rid of any Byte Order Marker (BOM)
 * present in the file's header.
 *
 * @param filePath the path of a file
 * @returns Promise which resolves with the content of the file
 */
export async function readFileAsync(filePath: string) {
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
export function stripBOM(str: string) {
  if (str.charCodeAt(0) === BOM_BYTE) {
    return str.slice(1);
  }
  return str;
}

/**
 * Asynchronous check if file is readable.
 *
 * @param path the file path
 * @returns true if file is readable. false otherwise
 */
export async function fileReadable(path: string) {
  try {
    await fs.access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Asynchronous check if path is directory.
 *
 * @param path the path to check
 * @returns true if file is a directory. false otherwise
 */
export async function pathIsDir(path: string) {
  return (await fs.lstat(path)).isDirectory();
}
