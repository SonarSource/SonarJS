/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { warn } from '../../../shared/src/helpers/logging.js';
import type { ProgramOptions } from '../jsts/program/tsconfig/options.js';
import type { ProjectAnalysisMeta } from '../projectAnalysis.js';

const MISSING_EXTENDED_TSCONFIG =
  'At least one referenced/extended tsconfig.json could not be resolved after trying multiple lookup paths. Analysis will continue without the missing configuration. Please install project dependencies using your package manager for a more complete analysis. Check DEBUG logs for the lookup paths tried.';

export function reportMissingExtendedTsConfig(
  tsconfig: string,
  programOptions: ProgramOptions,
  meta: ProjectAnalysisMeta,
): void {
  if (!programOptions.missingTsConfig) {
    return;
  }
  warn(`${tsconfig}: ${MISSING_EXTENDED_TSCONFIG}`);
  if (!meta.warnings.includes(MISSING_EXTENDED_TSCONFIG)) {
    meta.warnings.push(MISSING_EXTENDED_TSCONFIG);
  }
}
