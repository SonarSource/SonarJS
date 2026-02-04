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
import { readFile, type NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { EmbeddedAnalysisInput } from '../../../src/embedded/analysis/analysis.js';
import { JsTsAnalysisInput, JSTS_ANALYSIS_DEFAULTS } from '../../../src/analysis/analysis.js';
import { normalizeToAbsolutePath } from '../../../src/rules/helpers/index.js';

/**
 * Test input type that allows partial JsTsAnalysisInput fields for convenience.
 * All fields are optional and will be filled with sensible defaults.
 */
type TestJsTsInput = {
  filePath: string;
  fileContent?: string;
  fileType?: 'MAIN' | 'TEST';
  fileStatus?: 'SAME' | 'CHANGED' | 'ADDED';
  language?: 'js' | 'ts';
  analysisMode?: 'DEFAULT' | 'SKIP_UNCHANGED';
  ignoreHeaderComments?: boolean;
  allowTsParserJsFiles?: boolean;
  tsConfigs?: NormalizedAbsolutePath[];
  program?: JsTsAnalysisInput['program'];
  skipAst?: boolean;
  clearDependenciesCache?: boolean;
  sonarlint?: boolean;
};

/**
 * Creates a complete JsTsAnalysisInput for testing.
 * Uses JSTS_ANALYSIS_DEFAULTS and allows overrides for test-specific values.
 */
export async function jsTsInput(input: TestJsTsInput): Promise<JsTsAnalysisInput> {
  const filePath = normalizeToAbsolutePath(input.filePath);
  return {
    ...JSTS_ANALYSIS_DEFAULTS,
    filePath,
    fileContent: input.fileContent ?? (await readFile(filePath)),
    language: input.language ?? 'js',
    tsConfigs: input.tsConfigs ?? [],
    program: input.program,
    // Allow test-specific overrides
    ...(input.fileType !== undefined && { fileType: input.fileType }),
    ...(input.fileStatus !== undefined && { fileStatus: input.fileStatus }),
    ...(input.analysisMode !== undefined && { analysisMode: input.analysisMode }),
    ...(input.ignoreHeaderComments !== undefined && {
      ignoreHeaderComments: input.ignoreHeaderComments,
    }),
    ...(input.allowTsParserJsFiles !== undefined && {
      allowTsParserJsFiles: input.allowTsParserJsFiles,
    }),
    ...(input.skipAst !== undefined && { skipAst: input.skipAst }),
    ...(input.clearDependenciesCache !== undefined && {
      clearDependenciesCache: input.clearDependenciesCache,
    }),
    ...(input.sonarlint !== undefined && { sonarlint: input.sonarlint }),
  };
}

/**
 * Creates a complete EmbeddedAnalysisInput for testing.
 */
export async function embeddedInput(input: TestJsTsInput): Promise<EmbeddedAnalysisInput> {
  const filePath = normalizeToAbsolutePath(input.filePath);
  return {
    filePath,
    fileContent: input.fileContent ?? (await readFile(filePath)),
    sonarlint: input.sonarlint ?? false,
  };
}
