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
import type { RuleConfig } from '../config/rule-config.js';
import type { FileType } from '../../../contracts/file.js';
import type { JsTsLanguage } from '../../../common/configuration.js';
import type { AnalysisMode } from '../../analysis/analysis.js';
import type { ModuleType } from '../../rules/helpers/package-jsons/dependencies.js';
import type { Minimatch } from 'minimatch';

export interface RuleFilterContext {
  extensionName: string;
  fileType: FileType;
  fileLanguage: JsTsLanguage;
  analysisMode: AnalysisMode;
  detectedEsYear: number | undefined;
  detectedModuleType: ModuleType | undefined;
  dependencies: Set<string | Minimatch>;
}

/**
 * A predicate that determines whether a rule should be active for a given file context.
 * Returns true to keep the rule, false to exclude it.
 *
 * ruleMeta is the namespace export from metas.ts for the rule key, or undefined for
 * bundle rules that have no entry in metas. Each filter narrows it with 'field' in
 * ruleMeta guards.
 */
export type RuleFilter = (
  ruleConfig: RuleConfig,
  ruleMeta: Record<string, unknown> | undefined,
  context: RuleFilterContext,
) => boolean;
