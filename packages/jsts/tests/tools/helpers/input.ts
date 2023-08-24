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
import { FileType, readFile } from '@sonar/shared/helpers';
import { EmbeddedAnalysisInput } from '../../../src/embedded';
import { JsTsAnalysisInput } from '../../../src';

type allOptional = {
  filePath: string;
  fileContent?: string;
  fileType?: FileType;
  tsConfigs?: string[];
  programId?: string;
  linterId?: string;
};

export async function jsTsInput(input: allOptional): Promise<JsTsAnalysisInput> {
  return {
    filePath: input.filePath,
    fileContent: input.fileContent ?? (await readFile(input.filePath)),
    fileType: input.fileType ?? 'MAIN',
    programId: input.programId,
    linterId: input.linterId ?? 'default',
    tsConfigs: input.tsConfigs ?? [],
  };
}

export async function embeddedInput(input: allOptional): Promise<EmbeddedAnalysisInput> {
  return {
    filePath: input.filePath,
    fileContent: input.fileContent ?? (await readFile(input.filePath)),
    linterId: input.linterId ?? 'default',
  };
}
