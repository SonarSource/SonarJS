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
import * as babelESLintParser from '@babel/eslint-parser';
import * as vueESLintParser from 'vue-eslint-parser';
import * as typescriptESLintParser from '@typescript-eslint/parser';

/**
 * The ESLint-based parsers used to parse JavaScript, TypeScript, and Vue.js code.
 */
export const parsersMap = {
  javascript: babelESLintParser,
  typescript: typescriptESLintParser,
  vuejs: vueESLintParser,
};

export type ParserKey = keyof typeof parsersMap;
export type Parser = (typeof parsersMap)[ParserKey];

/**
 * Clears TypeScript ESLint parser's caches
 *
 * While analyzing multiple files that used TypeScript ESLint parser to
 * parse their respective code, raised issues may differ depending on
 * clearing or not TypeScript ESLint parser's caches. To address that,
 * the sensor requests clearing the caches for each considered TSConfig.
 */
export function clearTypeScriptESLintParserCaches() {
  typescriptESLintParser.clearCaches();
}
