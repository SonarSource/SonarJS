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
import { Issue } from '../../linter/issues/issue.js';
import { AnalysisInput, AnalysisOutput } from '../../../../shared/src/types/analysis.js';

/**
 * An analysis input of embedded code
 *
 * (currently empty but might change later on)
 */
export interface EmbeddedAnalysisInput extends AnalysisInput {}

/**
 * A YAML analysis output
 *
 * A YAML analysis only returns issues that were found during
 * linting. Because the JavaScript analyzer doesn't "own" the
 * `YAML` language, it cannot save anything else than issues
 * using SonarQube API, especially analysis data like metrics.
 *
 * @param issues the found issues
 */
export interface EmbeddedAnalysisOutput extends AnalysisOutput {
  issues: Issue[];
  ucfgPaths?: string[];
  metrics: {
    ncloc: number[];
  };
}
