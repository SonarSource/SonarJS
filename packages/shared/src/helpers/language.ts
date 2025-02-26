/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

/**
 * A discriminator between JavaScript and TypeScript languages. This is used
 * in rule configuration and analysis input.
 *
 * Analyzing JavaScript and TypeScript code is rather transparent and
 * indistinguishable since we use ESLint-based APIs not only to parse
 * but also to analyze source code. However, there are minor parsing
 * details that require a clear distinction between the two.
 */
export type JsTsLanguage = 'js' | 'ts';

import path from 'path';

export const JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
export const TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

export function isJsFile(filePath: string) {
  return JS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isTsFile(filePath: string, contents: string) {
  const extension = path.posix.extname(filePath).toLowerCase();
  return (
    TS_EXTENSIONS.includes(extension) || (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  );
}
