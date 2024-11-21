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
import path from 'path';

const HTML_EXTENSIONS = ['.html', '.htm'];
const YAML_EXTENSIONS = ['.yml', '.yaml'];
const JS_EXTENSIONS = [
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.vue',
  ...HTML_EXTENSIONS,
  ...YAML_EXTENSIONS,
];
const TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

export function isHtmlFile(filePath: string) {
  return HTML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: string) {
  return YAML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isJsFile(filePath: string) {
  return JS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isTsFile(filePath: string, contents: string) {
  const extension = path.posix.extname(filePath).toLowerCase();
  return (
    TS_EXTENSIONS.includes(extension) || (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  );
}
