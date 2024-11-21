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
import type {
  EmbeddedAnalysisInput as YamlAnalysisInput,
  EmbeddedAnalysisOutput as YamlAnalysisOutput,
} from '../../jsts/src/embedded/analysis/analysis.js';

import { analyzeEmbedded } from '../../jsts/src/embedded/analysis/analyzer.js';
import { parseAwsFromYaml } from './aws/parser.js';

export { YamlAnalysisInput, YamlAnalysisOutput };

export async function analyzeYAML(input: YamlAnalysisInput): Promise<YamlAnalysisOutput> {
  return Promise.resolve(analyzeEmbedded(input, parseAwsFromYaml));
}
