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
import { getContext } from 'helpers';
import { JsTsAnalysisInput } from 'services/analysis';
import { buildJs } from './build-js';
import { buildTs } from './build-ts';
import { buildVue } from './build-vue';
import { Language } from 'parsing/jsts';

/**
 * Builds an ESLint SourceCode for JavaScript / TypeScript
 *
 * This functions routes the parsing of the input based on the input language,
 * the file extension, and some contextual information.
 *
 * @param input the JavaScript / TypeScript analysis input
 * @param language the language of the input
 * @returns the parsed source code
 */
export function buildSourceCode(input: JsTsAnalysisInput, language: Language) {
  const isVueFile = input.filePath.toLowerCase().endsWith('.vue');

  if (language === 'ts') {
    return buildTs(input, isVueFile);
  }

  const tryTypeScriptParser = shouldTryTypeScriptParser();

  if (isVueFile) {
    return buildVue(input, tryTypeScriptParser);
  } else {
    return buildJs(input, tryTypeScriptParser);
  }
}

function shouldTryTypeScriptParser() {
  const context = getContext();
  return context ? context.shouldUseTypeScriptParserForJS : true;
}
