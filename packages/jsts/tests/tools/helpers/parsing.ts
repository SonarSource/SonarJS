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
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../src/rules/helpers/index.js';
import { JsTsAnalysisInput, JSTS_ANALYSIS_DEFAULTS } from '../../../src/analysis/analysis.js';

/**
 * Creates a complete JsTsAnalysisInput with all required fields.
 * Uses JSTS_ANALYSIS_DEFAULTS and allows overrides for test-specific values.
 */
function createCompleteInput(
  filePath: NormalizedAbsolutePath,
  fileContent: string,
  options: {
    tsConfigs?: NormalizedAbsolutePath[];
    fileType?: FileType;
    language: 'js' | 'ts';
    sonarlint?: boolean;
    allowTsParserJsFiles?: boolean;
  },
): JsTsAnalysisInput {
  return {
    ...JSTS_ANALYSIS_DEFAULTS,
    filePath,
    fileContent,
    language: options.language,
    tsConfigs: options.tsConfigs ?? [],
    ...(options.fileType !== undefined && { fileType: options.fileType }),
    ...(options.sonarlint !== undefined && { sonarlint: options.sonarlint }),
    ...(options.allowTsParserJsFiles !== undefined && {
      allowTsParserJsFiles: options.allowTsParserJsFiles,
    }),
  };
}

export async function parseTypeScriptSourceFile(
  filePath: string,
  tsConfigs: string[],
  fileType: FileType = 'MAIN',
  sonarlint = false,
) {
  const normalizedFilePath = normalizeToAbsolutePath(filePath);
  const fileContent = await readFile(normalizedFilePath);
  const normalizedTsConfigs = tsConfigs.map(tc => normalizeToAbsolutePath(tc));
  return build(
    createCompleteInput(normalizedFilePath, fileContent, {
      tsConfigs: normalizedTsConfigs,
      fileType,
      language: 'ts',
      sonarlint,
    }),
  );
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
  const normalizedTsConfigs = tsConfigs.map(tc => normalizeToAbsolutePath(tc));
  return build(
    createCompleteInput(normalizedFilePath, fileContent, {
      tsConfigs: normalizedTsConfigs,
      fileType,
      language: 'js',
      sonarlint,
      allowTsParserJsFiles,
    }),
  );
}
