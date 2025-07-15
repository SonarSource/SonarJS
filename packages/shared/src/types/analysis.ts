/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { readFile } from '../helpers/files.js';
import { Configuration } from '../helpers/configuration.js';

/**
 * An analysis input
 *
 * An analysis always operates on a file, be it from its path
 * or its content for any type of analysis.
 *
 * @param filePath the path of the file to analyze
 * @param fileContent the content of the file to analyze
 */
export interface AnalysisInput {
  filePath: string;
  sanitizedFilePath?: string;
  fileContent?: string;
  sonarlint?: boolean;
  configuration?: Configuration;
}

/**
 * An analysis output
 *
 * A common interface for all kinds of analysis output.
 */
export interface AnalysisOutput {}

/**
 * In SonarQube context, an analysis input includes both path and content of a file
 * to analyze. However, in SonarLint, we might only get the file path. As a result,
 * we read the file if the content is missing in the input.
 *
 * In SonarLint, the file paths are URI encoded (think %20 for spaces). We need to decode them before using native node
 * fs methods. Prefer input.sanitizedFilePath to input.filePath.
 */
export async function augmentAnalysisInput<T extends AnalysisInput>(
  input: T,
): Promise<
  Omit<T, 'fileContent'> &
    Omit<T, 'sanitizedFilePath'> & { fileContent: string; sanitizedFilePath: string }
> {
  const sanitizedFilePath = input.sanitizedFilePath ?? decodeURI(input.filePath);
  const fileContent = input.fileContent ?? (await readFile(sanitizedFilePath));
  return {
    ...input,
    fileContent,
    sanitizedFilePath,
  };
}
