/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { HtmlAnalysisInput, HtmlAnalysisOutput } from './analysis';
import { debug } from 'helpers';
import { getESLint, getLinter, transformMessages } from 'linting/eslint';

export async function analyzeHTML(input: HtmlAnalysisInput): Promise<HtmlAnalysisOutput> {
  debug(`Analyzing file "${input.filePath}" with linterId "${input.linterId}"`);
  const linter = getLinter(input.linterId);
  const eslint = getESLint(input.linterId);

  const results = await (input.fileContent
    ? eslint.lintText(input.fileContent, { filePath: input.filePath })
    : eslint.lintFiles(input.filePath));

  const { issues, ucfgPaths } = transformMessages(
    results?.length === 1 ? results[0].messages : [],
    { rules: linter.linter.getRules() },
  );
  return { issues, ucfgPaths };
}
