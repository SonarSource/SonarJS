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

import type { RuleFilter } from './rule-filter.js';
import { filterFileType } from './filter-file-type.js';
import { filterAnalysisMode } from './filter-analysis-mode.js';
import { filterLanguage } from './filter-language.js';
import { filterBlacklistedExtensions } from './filter-blacklisted-extensions.js';
import { filterDependency } from './filter-dependency.js';
import { filterReactVue } from './filter-react-vue.js';
import { filterEcmaVersion } from './filter-ecma-version.js';
import { filterModuleType } from './filter-module-type.js';

export type { RuleFilterContext } from './rule-filter.js';

/**
 * Ordered list of rule filters applied during getRulesForFile.
 * All filters must pass for a rule to be active.
 * Cheap config-based filters are ordered first to short-circuit early.
 * To add a new filter: create a filter-*.ts file and append it here.
 */
export const RULE_FILTERS: readonly RuleFilter[] = [
  filterFileType,
  filterAnalysisMode,
  filterLanguage,
  filterBlacklistedExtensions,
  filterDependency,
  filterReactVue,
  filterEcmaVersion,
  filterModuleType,
];
