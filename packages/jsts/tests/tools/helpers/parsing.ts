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
import { FileType, readFile } from '../../../../shared/src/helpers/files.js';
import { build } from '../../../src/builders/build.js';
import { normalizeToAbsolutePath } from '../../../src/rules/helpers/index.js';

export async function parseTypeScriptSourceFile(
  filePath: string,
  tsConfigs: string[],
  fileType: FileType = 'MAIN',
  sonarlint = false,
) {
  const normalizedFilePath = normalizeToAbsolutePath(filePath);
  const fileContent = await readFile(normalizedFilePath);
  return build({
    fileContent,
    filePath: normalizedFilePath,
    tsConfigs,
    fileType,
    language: 'ts',
    sonarlint,
  });
}

export async function parseJavaScriptSourceFile(
  filePath: string,
  tsConfigs: string[] = [],
  fileType: FileType = 'MAIN',
  sonarlint = false,
  allowTsParserJsFiles = true,
) {
  const normalizedFilePath = normalizeToAbsolutePath(filePath);
  const fileContent = await readFile(normalizedFilePath);
  return build({
    fileContent,
    filePath: normalizedFilePath,
    tsConfigs,
    fileType,
    language: 'js',
    sonarlint,
    allowTsParserJsFiles,
  });
}
