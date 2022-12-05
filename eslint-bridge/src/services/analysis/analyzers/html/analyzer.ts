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
import {getESLint, getLinter, transformMessages} from 'linting/eslint';
import { buildParserOptions, parsers, shouldTryTypeScriptParser } from 'parsing/jsts';
import path from 'path';
import { computeExtendedMetrics } from '../js';

export async function analyzeHTML(input: HtmlAnalysisInput): Promise<HtmlAnalysisOutput> {
  debug(`Analyzing file "${input.filePath}" with linterId "${input.linterId}"`);
  const tryTypeScriptParser = shouldTryTypeScriptParser();
  const [parser, parserOptions] = tryTypeScriptParser
    ? [parsers.typescript.parser, buildParserOptions(input, false)]
    : [parsers.javascript.parser, buildParserOptions(input, true)];
  const linter = getLinter(input.linterId);
  const eslint = getESLint(input.linterId);
  const { getLinterInternalSlots } = await import(
    path.join(require.resolve('eslint'), '..', 'linter', 'linter')
    );
  getLinterInternalSlots(linter.linter).lastConfigArray = {parser, parserOptions};

  const results = await (input.fileContent
    ? eslint.lintText(input.fileContent, { filePath: input.filePath })
    : eslint.lintFiles(input.filePath));

  const sourceCode = getLinterInternalSlots(linter.linter).lastSourceCode;
  const { issues, highlightedSymbols, cognitiveComplexity, ucfgPaths } = transformMessages(
    results?.length === 1 ? results[0].messages : [],
    { sourceCode, rules: linter.linter.getRules() },
  );
  const extendedMetrics = computeExtendedMetrics(
    input,
    sourceCode,
    highlightedSymbols,
    cognitiveComplexity,
  );
  return { issues, ucfgPaths, ...extendedMetrics };
}
