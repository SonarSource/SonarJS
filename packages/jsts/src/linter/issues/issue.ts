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
import { QuickFix } from '../quickfixes/quickfix.js';
import { Location } from './location.js';
import { JsTsLanguage } from '../../../../shared/src/helpers/configuration.js';
import type { NormalizedAbsolutePath } from '../../rules/helpers/index.js';
import { BaseIssue } from '../../../../shared/src/types/analysis.js';

/**
 * A SonarQube-compatible source code issue
 *
 * It is used to send back a JS/TS analysis response to the plugin, which
 * eventually saves the issue data to SonarQube.
 *
 * @param ruleId the rule key
 * @param line the issue starting line
 * @param column the issue starting column
 * @param endLine the issue ending line
 * @param endColumn the issue ending column
 * @param message the issue message
 * @param cost the cost to fix the issue
 * @param secondaryLocations the issue secondary locations
 * @param quickFixes the issue quick fixes
 */
export interface JsTsIssue extends BaseIssue {
  language: JsTsLanguage;
  endLine?: number;
  endColumn?: number;
  cost?: number;
  secondaryLocations: Location[];
  quickFixes?: QuickFix[];
  ruleESLintKeys: Array<string>;
  filePath: NormalizedAbsolutePath;
}
