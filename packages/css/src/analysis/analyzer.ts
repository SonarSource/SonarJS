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
import { CssAnalysisInput, CssAnalysisOutput } from './analysis.js';
import { linter } from '../linter/wrapper.js';
import { createStylelintConfig } from '../linter/config.js';
import { fillFileContent } from '../../../shared/src/types/analysis.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { error } from '../../../shared/src/helpers/logging.js';

/**
 * Analyzes a CSS analysis input
 *
 * Analyzing a CSS analysis input is rather straighforward. All that is needed
 * is to create a Stylelint configuration based on the rules from the active
 * quality profile and uses this configuration to linter the input file.
 *
 * @param input the CSS analysis input to analyze
 * @returns a promise of the CSS analysis output
 */
export async function analyzeCSS(input: CssAnalysisInput): Promise<CssAnalysisOutput> {
  const { filePath, fileContent, rules } = await fillFileContent(input);
  const config = createStylelintConfig(rules);
  const sanitizedCode = fileContent.replace(/[\u2000-\u200F]/g, ' ');

  const options = {
    code: sanitizedCode,
    codeFilename: filePath,
    config,
  };
  return linter.lint(filePath, options).catch(err => {
    error(`Linter failed to parse file ${filePath}: ${err}`);
    throw APIError.linterError(`Linter failed to parse file ${filePath}: ${err}`);
  });
}
