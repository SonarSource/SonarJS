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
import { QuickFix } from '../quickfixes/quickfix.js';
import { Location } from './location.js';

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
export interface Issue {
  ruleId: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  cost?: number;
  secondaryLocations: Location[];
  quickFixes?: QuickFix[];
}
