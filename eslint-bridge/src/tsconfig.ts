/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

const parseConfigHost: ts.ParseConfigHost = {
  fileExists: fs.existsSync,
  readDirectory: ts.sys.readDirectory,
  // 'readFile' is unused for our purposes
  readFile: file => /* istanbul ignore next */ fs.readFileSync(file, "utf8"),
  useCaseSensitiveFileNames: true,
};

export function getFilesForTsConfig(tsConfig: string): string[] {
  const config = ts.readConfigFile(tsConfig, ts.sys.readFile);

  if (config.error !== undefined) {
    console.error(`Failed to parse tsconfig: ${tsConfig} (${config.error.messageText})`);
    return [];
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    parseConfigHost,
    path.resolve(path.dirname(tsConfig)),
    {
      noEmit: true,
    },
  );

  // defensive empty array
  return parsed.fileNames || [];
}
