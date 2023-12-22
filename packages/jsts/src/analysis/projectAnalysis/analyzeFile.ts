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

import { analyzeJSTS, JsTsAnalysisInput, JsTsAnalysisOutput } from '../../';
import { EMPTY_JSTS_ANALYSIS_OUTPUT } from '../../../../bridge/src/errors';

/**
 * Safely analyze a JavaScript/TypeScript file wrapping raised exceptions in the output format
 * @param input JsTsAnalysisInput object containing all the data necessary for the analysis
 */
export function analyzeFile(input: JsTsAnalysisInput) {
  try {
    const result = analyzeJSTS(input, input.language!);
    result.language = input.language;
    return result;
  } catch (e) {
    return {
      parsingError: {
        message: e.message,
        code: e.code,
        line: e.data?.line,
      },
      ...EMPTY_JSTS_ANALYSIS_OUTPUT,
    } as JsTsAnalysisOutput;
  }
}
