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
import { FileType, readFile } from 'helpers';
import { buildSourceCode } from 'parsing/jsts';

export async function parseTypeScriptSourceFile(
  filePath: string,
  tsConfigs: string[],
  fileType: FileType = 'MAIN',
) {
  const fileContent = await readFile(filePath);
  return buildSourceCode({ fileContent, filePath, tsConfigs, fileType }, 'ts');
}

export async function parseJavaScriptSourceFile(
  filePath: string,
  tsConfigs: string[] = [],
  fileType: FileType = 'MAIN',
) {
  const fileContent = await readFile(filePath);
  return buildSourceCode({ fileContent, filePath, tsConfigs, fileType }, 'js');
}
