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
import { mapConcurrent } from '../../../shared/src/helpers/concurrency.js';
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
  const sanitizeEntry = async ([key, fileInput]: readonly [string, ProjectAnalysisFileInput]) => {
    const filePath = normalizeToAbsolutePath(fileInput.filePath, baseDir);
    const fileContent =
      fileInput.fileContent === undefined
        ? await readFile(filePath)
        : stripBOM(fileInput.fileContent);
    let rawFileType: FileType | undefined = fileInput.fileType;
    if (rawFileType !== 'TEST') {
      // We cannot trust the caller to provide the correct fileType, so infer it from configured
      // source/test paths. Filename heuristics must only affect rule selection.
      const inferredFileType = filterPathAndGetFileType(filePath, filterPathParams);
      if (inferredFileType) {
        rawFileType = inferredFileType;
      }
    }
    const fileType = rawFileType ?? JSTS_ANALYSIS_DEFAULTS.fileType;
    if (await shouldIgnoreFile({ filePath, fileContent }, getShouldIgnoreParams(configuration))) {
      return undefined;
    }
    return {
      key,
      file: {
        filePath,
        fileContent,
        fileType,
        ruleFileType: getFileTypeForRules(filePath, fileType, filterPathParams),
        fileStatus: fileInput.fileStatus ?? JSTS_ANALYSIS_DEFAULTS.fileStatus,
      },
    };
  };
  const registerEntry = (entry: Awaited<ReturnType<typeof sanitizeEntry>>) => {
    if (entry) {
      files[entry.file.filePath] = entry.file;
      pathMap.set(entry.file.filePath, entry.key);
    }
  };

  // IDE requests often supply every file's content; scheduling cannot accelerate those inputs.
  if (hasMissingFileContent(inputFiles)) {
    for await (const entry of mapConcurrent(inputEntries(inputFiles), sanitizeEntry)) {
      registerEntry(entry);
    }
  } else {
    for (const entry of inputEntries(inputFiles)) {
      registerEntry(await sanitizeEntry(entry));
    }
  }

  return {
    files,
    pathMap,
  };
}

// Avoid materializing an entries array or a task promise for every input file.
function* inputEntries(inputFiles: Record<string, ProjectAnalysisFileInput>) {
  for (const key in inputFiles) {
    if (Object.hasOwn(inputFiles, key)) {
      yield [key, inputFiles[key]] as const;
    }
  }
}

function hasMissingFileContent(inputFiles: Record<string, ProjectAnalysisFileInput>) {
  for (const [, fileInput] of inputEntries(inputFiles)) {
    if (fileInput.fileContent === undefined) {
      return true;
    }
  }
  return false;
}
