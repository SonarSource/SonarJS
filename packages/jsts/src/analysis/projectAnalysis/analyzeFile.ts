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
import { handleError } from '../../../../bridge/src/errors/index.js';
import { JsTsAnalysisInput } from '../analysis.js';
import { analyzeHTML } from '../../../../html/src/index.js';
import { analyzeYAML } from '../../../../yaml/src/index.js';
import { analyzeJSTS } from '../analyzer.js';
import { isHtmlFile, isYamlFile } from '../../../../shared/src/helpers/configuration.js';
import { serializeError } from '../../../../bridge/src/request.js';
import { FileResult } from './projectAnalysis.js';

/**
 * Safely analyze a JavaScript/TypeScript file wrapping raised exceptions in the output format
 * @param input JsTsAnalysisInput object containing all the data necessary for the analysis
 */
export async function analyzeFile(input: JsTsAnalysisInput): Promise<FileResult> {
  try {
    return await getAnalyzerForFile(input.filePath)(input);
  } catch (e) {
    return handleError(serializeError(e));
  }
}

function getAnalyzerForFile(filename: string) {
  if (isHtmlFile(filename)) {
    return analyzeHTML;
  } else if (isYamlFile(filename)) {
    return analyzeYAML;
  } else {
    return analyzeJSTS;
  }
}
