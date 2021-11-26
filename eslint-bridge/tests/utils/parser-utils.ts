/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import path from 'path';
import { FileType } from '../../src/analyzer';
import { buildSourceCode } from '../../src/parser';
import { Programs } from '../../src/programs';

const DEFAULT_JS_TSCONFIG = path.join(__dirname, '../fixtures/js-project/tsconfig.json');
const DEFAULT_TS_TSCONFIG = path.join(__dirname, '../fixtures/ts-project/tsconfig.json');

export function parseTypeScriptSourceFile(
  fileContent: string,
  filePath: string,
  tsConfig: string = DEFAULT_TS_TSCONFIG,
  fileType: FileType = 'MAIN',
) {
  return buildSourceCode(
    { program: programFromTsConfig(tsConfig), fileContent, filePath, fileType },
    'ts',
  );
}

export function parseJavaScriptSourceFile(
  fileContent: string,
  filePath: string,
  tsConfig: string = DEFAULT_JS_TSCONFIG,
  fileType: FileType = 'MAIN',
) {
  return buildSourceCode(
    { program: programFromTsConfig(tsConfig), fileContent, filePath, fileType },
    'js',
  );
}

function programFromTsConfig(tsConfig: string): string {
  return Programs.getInstance().create(tsConfig).id;
}
