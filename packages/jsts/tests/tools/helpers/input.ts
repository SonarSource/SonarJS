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
import { EmbeddedAnalysisInput } from '../../../src/embedded/analysis/analysis.js';
import { JsTsAnalysisInput } from '../../../src/analysis/analysis.js';

type allOptional = {
  filePath: string;
  fileContent?: string;
  fileType?: FileType;
  tsConfigs?: string[];
  programId?: string;
  linterId?: string;
  skipAst?: boolean;
};

export async function jsTsInput(input: allOptional): Promise<JsTsAnalysisInput> {
  return {
    filePath: input.filePath,
    fileContent: input.fileContent ?? (await readFile(input.filePath)),
    fileType: input.fileType ?? 'MAIN',
    programId: input.programId,
    linterId: input.linterId ?? 'default',
    tsConfigs: input.tsConfigs ?? [],
    skipAst: input.skipAst ?? false,
  };
}

export async function embeddedInput(input: allOptional): Promise<EmbeddedAnalysisInput> {
  return {
    filePath: input.filePath,
    fileContent: input.fileContent ?? (await readFile(input.filePath)),
    linterId: input.linterId ?? 'default',
  };
}
