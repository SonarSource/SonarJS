/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { FileType, readFile } from '../../../../shared/src/helpers/files.js';
import { buildSourceCode } from '../../../src/builders/build.js';

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
