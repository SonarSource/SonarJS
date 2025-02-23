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
import { parseParsingError } from '../../../../bridge/src/errors/index.js';
import { JsTsAnalysisInput } from '../analysis.js';
import { analyzeJSTS } from '../analyzer.js';

/**
 * Safely analyze a JavaScript/TypeScript file wrapping raised exceptions in the output format
 * @param input JsTsAnalysisInput object containing all the data necessary for the analysis
 */
export function analyzeFile(input: JsTsAnalysisInput) {
  try {
    return analyzeJSTS(input);
  } catch (e) {
    return parseParsingError(e);
  }
}
