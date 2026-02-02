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
import { analyzeEmbedded } from '../../jsts/src/embedded/analysis/analyzer.js';
import { parseAwsFromYaml } from './aws/parser.js';

import type {
  EmbeddedAnalysisInput,
  EmbeddedAnalysisOutput,
} from '../../jsts/src/embedded/analysis/analysis.js';

/**
 * Analyzes a YAML file for embedded JavaScript code.
 * The input must be fully sanitized (all fields required) before calling this function.
 *
 * @param input the sanitized analysis input
 * @returns the analysis output with issues found in embedded JS
 */
export async function analyzeYAML(input: EmbeddedAnalysisInput): Promise<EmbeddedAnalysisOutput> {
  return analyzeEmbedded(input, parseAwsFromYaml);
}
