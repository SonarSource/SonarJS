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
import { Issue } from 'linting/eslint';
import { AnalysisInput, AnalysisOutput } from 'services/analysis';

/**
 * A YAML analysis input
 *
 * (currently empty but might change later on)
 */
export interface YamlAnalysisInput extends AnalysisInput {}

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
export interface YamlAnalysisOutput extends AnalysisOutput {
  issues: Issue[];
  ucfgPaths?: string[];
}
