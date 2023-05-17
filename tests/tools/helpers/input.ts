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
import { readFile, toUnixPath } from 'helpers';
import { JsTsAnalysisInput, EmbeddedAnalysisInput } from 'services/analysis';
import { loadTsconfigs } from './load-tsconfigs';
import { shouldCreateProgram, shouldUseTypescriptParser } from 'parsing/jsts';
import path from 'path';

const defaultInput: JsTsAnalysisInput = {
  filePath: '',
  baseDir: '',
  fileContent: undefined,
  fileType: 'MAIN',
  tsConfigs: [],
  linterId: 'default',
  createProgram: true,
  forceUpdateTSConfigs: false,
  useFoundTSConfigs: false,
  language: 'js',
};

export async function jsTsInput(input: any): Promise<JsTsAnalysisInput> {
  input.filePath = toUnixPath(input.filePath);
  if (!input.baseDir) {
    input.baseDir = path.posix.dirname(toUnixPath(input.filePath));
  }
  const newInput = { ...defaultInput, ...input };
  if (shouldUseTypescriptParser(newInput.language) && shouldCreateProgram(newInput)) {
    await loadTsconfigs(newInput.tsConfigs);
  }
  if (!newInput.fileContent) {
    newInput.fileContent = await readFile(newInput.filePath);
  }
  return newInput;
}

export async function embeddedInput({
  filePath = '',
  fileContent = undefined,
  linterId = 'default',
}): Promise<EmbeddedAnalysisInput> {
  return { filePath, fileContent: fileContent || (await readFile(filePath)), linterId };
}
