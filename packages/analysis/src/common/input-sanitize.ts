/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  readFile,
  stripBOM,
} from '../../../shared/src/helpers/files.js';
import type { FileType } from '../contracts/file.js';
import { type Configuration, getFilterPathParams, getShouldIgnoreParams } from './configuration.js';
import { filterPathAndGetFileType, getFileTypeForRules } from './filter/filter-path.js';
import { shouldIgnoreFile } from './filter/filter.js';
import { type FileStatus, JSTS_ANALYSIS_DEFAULTS } from '../jsts/analysis/analysis.js';
import type { RuleConfig as CssRuleConfig } from '../css/linter/config.js';
import type { RuleConfig } from '../jsts/linter/config/rule-config.js';
import { type AnalyzableFiles, createAnalyzableFiles } from '../projectAnalysis.js';

export interface SanitizedProjectAnalysisInput {
  rules: RuleConfig[];
  cssRules: CssRuleConfig[];
  baseDir: NormalizedAbsolutePath;
  bundles: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
  configuration: Configuration;
  pathMap: Map<string, string>;
}

export type ProjectAnalysisFileInput = {
  filePath: string;
  fileContent?: string;
  fileType?: FileType;
  fileStatus?: FileStatus;
};

type SanitizedInputFiles = {
  files: AnalyzableFiles;
  pathMap: Map<string, string>;
};

export async function sanitizeInputFiles(
  inputFiles: Record<string, ProjectAnalysisFileInput> | undefined,
  configuration: Configuration,
): Promise<SanitizedInputFiles> {
  const { baseDir } = configuration;
  const files = createAnalyzableFiles();
  const pathMap = new Map<string, string>();

  if (!inputFiles) {
    return {
      files,
      pathMap,
    };
  }

  const filterPathParams = getFilterPathParams(configuration);
  for (const [key, fileInput] of Object.entries(inputFiles)) {
    const filePath = normalizeToAbsolutePath(fileInput.filePath, baseDir);
    const fileContent =
      fileInput.fileContent === undefined
        ? await readFile(filePath)
        : stripBOM(fileInput.fileContent);
    let rawFileType: FileType | undefined = fileInput.fileType;
    if (rawFileType !== 'TEST') {
      // We cannot trust the caller to provide the correct fileType, so we attempt to infer it from
      // configured source/test paths if not explicitly set to 'TEST'. Filename heuristics are kept
      // separate because they must only affect rule selection.
      const inferredFileType = filterPathAndGetFileType(filePath, filterPathParams);
      if (inferredFileType) {
        rawFileType = inferredFileType;
      }
    }
    const fileType = rawFileType ?? JSTS_ANALYSIS_DEFAULTS.fileType;
    const rawFileStatus = fileInput.fileStatus;

    if (await shouldIgnoreFile({ filePath, fileContent }, getShouldIgnoreParams(configuration))) {
      continue;
    }

    files[filePath] = {
      filePath,
      fileContent,
      fileType,
      ruleFileType: getFileTypeForRules(filePath, fileType, filterPathParams),
      fileStatus: rawFileStatus ?? JSTS_ANALYSIS_DEFAULTS.fileStatus,
    };
    pathMap.set(filePath, key);
  }

  return {
    files,
    pathMap,
  };
}
