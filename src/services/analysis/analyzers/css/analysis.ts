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
import { Issue, RuleConfig } from '../../../../linting/stylelint';
import { AnalysisInput, AnalysisOutput } from '../../analysis';

/**
 * A CSS analysis input
 *
 * A CSS analysis input only needs an input file and a set
 * of rule configurations to analyze a stylesheet.
 *
 * @param rules the rules from the active quality profile
 */
export interface CssAnalysisInput extends AnalysisInput {
  rules: RuleConfig[];
}

/**
 * A CSS analysis output
 *
 * Computing data analysis like metrics does nit realy makes
 * sense in the context of stylesheets. Therefore, only issues
 * form the content of a CSS analysis output beside an analysis
 * error.
 *
 * @param issues
 */
export interface CssAnalysisOutput extends AnalysisOutput {
  issues: Issue[];
}
