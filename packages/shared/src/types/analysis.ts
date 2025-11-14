/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
 */
export async function fillFileContent<T extends AnalysisInput>(
  input: T,
): Promise<Omit<T, 'fileContent'> & { fileContent: string }> {
  if (!isCompleteAnalysisInput(input)) {
    return {
      ...input,
      fileContent: await readFile(input.filePath),
    };
  }
  return input;
}

function isCompleteAnalysisInput<T extends AnalysisInput>(
  input: T,
): input is T & { fileContent: string } {
  return 'fileContent' in input;
}
