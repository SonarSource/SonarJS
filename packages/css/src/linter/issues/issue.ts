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
import type { BaseIssue } from '../../../../shared/src/types/analysis.js';

/**
 * A SonarQube-compatible stylesheet issue
 *
 * Stylelint linting results include location information: starting line/column
 * and optionally ending line/column (exclusive end position).
 *
 * It is used to send back a CSS analysis response to the plugin, which
 * eventually saves the issue data to SonarQube.
 */
export interface CssIssue extends BaseIssue {
  language: 'css';
}
